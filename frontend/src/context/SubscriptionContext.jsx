import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import subscriptionService from '../services/subscriptionService'

const SubscriptionContext = createContext()

export function SubscriptionProvider({ children }) {
  const { user, updateUser } = useAuth()
  const [subscription, setSubscription] = useState(null)
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setSubscription(null)
      setPlans([])
      setLoading(false)
      return
    }
    setLoading(true)
    Promise.all([
      subscriptionService.getMySubscription().catch(() => null),
      subscriptionService.getPlans().catch(() => []),
    ]).then(([sub, plansData]) => {
      // Normalize: store the actual subscription object or null.
      if (sub && sub.plan) {
        setSubscription(sub)
      } else {
        setSubscription(null)
      }
      setPlans(plansData || [])
    }).finally(() => setLoading(false))
  }, [user])

  // Premium if: user role is 'premium', OR they have an active paid subscription
  const hasActiveSubscription = !!(subscription && subscription.plan && subscription.plan.price > 0)
  const isPremium = user?.role === 'premium' || hasActiveSubscription
  const monthlyLimit = isPremium ? Infinity : 5

  const subscribe = async (planId) => {
    const result = await subscriptionService.subscribe(planId)
    // Refresh subscription state
    const sub = await subscriptionService.getMySubscription().catch(() => null)
    setSubscription(sub && sub.plan ? sub : null)
    // Sync the role in AuthContext so every part of the app reflects premium instantly
    updateUser({ role: result?.role || 'premium' })
    return result
  }

  const cancel = async () => {
    await subscriptionService.cancelSubscription()
    setSubscription(null)
    // Revert role in AuthContext
    updateUser({ role: 'user' })
  }

  return (
    <SubscriptionContext.Provider value={{
      subscription, plans, loading, isPremium,
      monthlyLimit, subscribe, cancel
    }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  return useContext(SubscriptionContext)
}
