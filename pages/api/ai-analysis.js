import OpenAI from 'openai';
import { getUserSubscription } from '../../lib/storage.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set');
    return res.status(500).json({ error: 'OPENAI_API_KEY missing' });
  }

  if (req.method !== 'POST') {
    console.warn(`Invalid method: ${req.method}`);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, action = 'analyze_sentiment', posts, userAddress } = req.body;

  // Log request body for debugging
  console.log('AI analysis request:', { text, action, posts, userAddress });

  // Validate inputs
  if (!userAddress || !userAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    console.warn('Invalid or missing userAddress:', userAddress);
    return res.status(400).json({ error: 'Valid userAddress required' });
  }
  if (!['analyze_sentiment', 'find_counter_narratives'].includes(action)) {
    console.warn('Invalid action:', action);
    return res.status(400).json({ error: 'Invalid action' });
  }

  // Verify subscription
  try {
    const subscription = await getUserSubscription(userAddress.toLowerCase());
    const userTier = subscription?.status === 'active' && new Date(subscription.expires_at) > new Date()
      ? subscription.tier
      : 'free';
    const aiLimits = { free: 10, premium: 'unlimited', pro: 'unlimited' };
    if (aiLimits[userTier] !== 'unlimited' && aiLimits[userTier] <= 0) {
      console.warn(`AI limit reached for user: ${userAddress}, tier: ${userTier}`);
      return res.status(403).json({ error: `AI analysis limit reached for ${userTier} tier` });
    }
  } catch (error) {
    console.error('Subscription check error:', error.message);
    return res.status(500).json({ error: 'Failed to verify subscription', details: error.message });
  }

  try {
    if (action === 'analyze_sentiment') {
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        console.warn('Invalid or missing text:', text);
        return res.status(400).json({ error: 'Valid text required' });
      }

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Analyze the sentiment and dominant viewpoint of this social media post. Return a JSON with: sentiment (positive/negative/neutral), dominant_view (brief description), confidence (0-1), and key_themes (array of 2-3 main topics).'
          },
          { role: 'user', content: text }
        ],
        temperature: 0.3,
        max_tokens: 150,
      });

      let analysis;
      try {
        analysis = JSON.parse(response.choices[0].message.content);
      } catch (parseError) {
        console.error('JSON parsing error for sentiment analysis:', parseError.message);
        analysis = {
          sentiment: 'neutral',
          dominant_view: 'Unable to analyze due to parsing error',
          confidence: 0.5,
          key_themes: ['analysis_failed'],
        };
      }
      console.log('Sentiment analysis result:', analysis);
      return res.status(200).json(analysis);
    }

    if (action === 'find_counter_narratives') {
      if (!Array.isArray(posts) || posts.length === 0) {
        console.warn('Invalid or missing posts:', posts);
        return res.status(400).json({ error: 'Valid posts array required' });
      }

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Given these social media posts about a topic, identify which ones present counter-narratives or alternative viewpoints. Return JSON with: counter_posts (array of post indices that present different perspectives), main_narrative (dominant viewpoint), counter_themes (alternative viewpoints found).'
          },
          { role: 'user', content: JSON.stringify(posts) }
        ],
        temperature: 0.3,
        max_tokens: 300,
      });

      let analysis;
      try {
        analysis = JSON.parse(response.choices[0].message.content);
      } catch (parseError) {
        console.error('JSON parsing error for counter-narratives:', parseError.message);
        analysis = {
          counter_posts: [],
          main_narrative: 'Unable to analyze due to parsing error',
          counter_themes: ['analysis_failed'],
        };
      }
      console.log('Counter-narratives result:', analysis);
      return res.status(200).json(analysis);
    }
  } catch (error) {
    console.error('AI Analysis error:', error.message);
    return res.status(500).json({
      error: 'Failed to process analysis',
      details: error.message || 'Unknown error',
    });
  }
}
