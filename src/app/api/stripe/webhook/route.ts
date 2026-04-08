import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe/client'
import { createServiceClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'
import type { SubscriptionPlan } from '@/types'

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  // Log the event
  await supabase.from('stripe_webhook_events').upsert({
    stripe_event_id: event.id,
    event_type: event.type,
    payload: event.data,
    processed: false,
  })

  try {
    switch (event.type) {

      // ── Subscription created or updated ──
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.supabase_user_id
        const plan = session.metadata?.plan as SubscriptionPlan

        if (!userId || !plan) break

        const months = plan === 'elite' ? 12 : 1

        await supabase.rpc('activate_subscription', {
          p_user_id: userId,
          p_plan: plan,
          p_stripe_session_id: session.id,
          p_stripe_subscription_id: session.subscription as string,
          p_months: months,
        })
        break
      }

      // ── Subscription renewed ──
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.billing_reason !== 'subscription_cycle') break

        const subscription = await stripe.subscriptions.retrieve(
          invoice.subscription as string
        )
        const userId = subscription.metadata?.supabase_user_id
        const plan = subscription.metadata?.plan as SubscriptionPlan

        if (!userId || !plan) break

        const months = plan === 'elite' ? 12 : 1

        await supabase.rpc('activate_subscription', {
          p_user_id: userId,
          p_plan: plan,
          p_stripe_session_id: invoice.id,
          p_stripe_subscription_id: subscription.id,
          p_months: months,
        })
        break
      }

      // ── Subscription cancelled / expired ──
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.supabase_user_id
        if (!userId) break

        await supabase
          .from('users')
          .update({ subscription_plan: 'free', updated_at: new Date().toISOString() })
          .eq('id', userId)

        await supabase
          .from('subscriptions')
          .update({ is_active: false })
          .eq('user_id', userId)
          .eq('is_active', true)
        break
      }

      // ── Payment failed ──
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await supabase
          .from('stripe_sessions')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', invoice.subscription as string)
        break
      }
    }

    // Mark event as processed
    await supabase
      .from('stripe_webhook_events')
      .update({ processed: true })
      .eq('stripe_event_id', event.id)

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook processing error:', error)
    await supabase
      .from('stripe_webhook_events')
      .update({ error: String(error) })
      .eq('stripe_event_id', event.id)

    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}

// Stripe needs raw body — disable Next.js body parsing
export const config = { api: { bodyParser: false } }
