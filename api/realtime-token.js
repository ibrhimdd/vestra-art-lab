import { createDecartClient } from '@decartai/sdk'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authorization = req.headers.authorization || ''
  const idToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!idToken) return res.status(401).json({ error: 'Authentication required' })

  const firebaseApiKey = process.env.VITE_FIREBASE_API_KEY
  const decartApiKey = process.env.DECART_API_KEY
  if (!firebaseApiKey || !decartApiKey) {
    return res.status(503).json({ error: 'Virtual try-on is not configured yet.' })
  }

  try {
    const verifyResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      },
    )
    if (!verifyResponse.ok) return res.status(401).json({ error: 'Your session is invalid. Please sign in again.' })
    const identity = await verifyResponse.json()
    if (!identity.users?.[0]?.localId) return res.status(401).json({ error: 'Unable to verify account.' })

    const decart = createDecartClient({ apiKey: decartApiKey })
    const token = await decart.tokens.create({
      expiresIn: 300,
      metadata: { service_tier: 0 },
    })
    return res.status(200).json({ apiKey: token.apiKey, expiresAt: token.expiresAt })
  } catch (error) {
    console.error('Decart token creation failed:', error?.message || error)
    return res.status(502).json({ error: 'Could not start the virtual try-on service. Please try again.' })
  }
}
