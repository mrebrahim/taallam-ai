import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { stripe, STRIPE_PRICES } from '@/lib/stripe/client'
import type { SubscriptionPlan } from '@/types'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { plan } = await request.json() as { plan: SubscriptionPlan }

    if (plan === 'free') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const serviceClient = await createServiceClient()

    // Get or create Stripe customer
    let stripeCustomerId: string
    const { data: existingCustomer } = await serviceClient
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (existingCustomer) {
      stripeCustomerId = existingCustomer.stripe_customer_id
    } else {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: { supabase_user_id: user.id },
      })
      stripeCustomerId = customer.id

      await serviceClient.from('stripe_customers').insert({
        user_id: user.id,
        stripe_customer_id: stripeCustomerId,
        email: user.email,
      })
    }

    // Pick price based on plan
    const priceId = plan === 'pro'
      ? STRIPE_PRICES.pro_monthly
      : STRIPE_PRICES.elite_yearly

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/upgrade?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/upgrade?cancelled=true`,
      metadata: {
        supabase_user_id: user.id,
        plan,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan,
        },
      },
    })

    // Log session in DB
    await serviceClient.from('stripe_sessions').insert({
      user_id: user.id,
      stripe_session_id: session.id,
      amount_usd: plan === 'pro' ? 10.00 : 100.00,
      status: 'pending',
      metadata: { plan },
    })

    return NextResponse.json({ url: session.url })

  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 })
  }
}
