import { TwitterApi } from 'twitter-api-v2';
import { getUserSubscription } from '../../lib/storage.js';

// Initialize Twitter client
const twitterClient = new TwitterApi(process.env.X_BEARER_TOKEN);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { topic, source = 'twitter', userAddress } = req.body;

  // Validate inputs
  if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
    return res.status(400).json({ error: 'Valid topic required' });
  }
  if (!['twitter', 'news'].includes(source)) {
    return res.status(400).json({ error: 'Invalid source' });
  }
  if (!userAddress || !userAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    return res.status(400).json({ error: 'Valid userAddress required' });
  }

  try {
    // Verify subscription for cross_platform feature
    const subscription = await getUserSubscription(userAddress.toLowerCase());
    const userTier = subscription?.status === 'active' && new Date(subscription.expires_at) > new Date()
      ? subscription.tier
      : 'free';
    if (!['premium', 'pro'].includes(userTier)) {
      return res.status(403).json({ error: 'Premium or Pro subscription required for cross-platform fetch' });
    }

    if (source === 'twitter') {
      if (!process.env.X_BEARER_TOKEN) {
        return res.status(500).json({ error: 'X API credentials missing' });
      }

      const tweets = await twitterClient.v2.search(topic, {
        max_results: 10,
        'tweet.fields': ['author_id', 'created_at', 'public_metrics', 'text']
      });

      const formattedTweets = tweets.data?.map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        author_id: tweet.author_id,
        created_at: tweet.created_at,
        metrics: tweet.public_metrics,
        source: 'twitter'
      })) || [];

      return res.status(200).json({ posts: formattedTweets });
    }

    if (source === 'news') {
      if (!process.env.NEWS_API_KEY) {
        return res.status(500).json({ error: 'NEWS_API_KEY missing' });
      }

      const newsResponse = await fetch(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(topic)}&sortBy=relevancy&apiKey=${process.env.NEWS_API_KEY}&pageSize=10`,
        {
          cache: 'force-cache',
          next: { revalidate: 300 } // Cache for 5 minutes
        }
      );

      if (!newsResponse.ok) {
        const errorData = await newsResponse.json().catch(() => ({}));
        throw new Error(`News API error: ${newsResponse.status} - ${JSON.stringify(errorData)}`);
      }

      const newsData = await newsResponse.json();
      const formattedNews = newsData.articles?.map(article => ({
        id: article.url,
        text: article.title + (article.description ? ': ' + article.description : ''),
        author: article.source.name,
        created_at: article.publishedAt,
        url: article.url,
        source: 'news'
      })) || [];

      return res.status(200).json({ posts: formattedNews });
    }
  } catch (error) {
    console.error('Cross-platform fetch error:', error);
    return res.status(500).json({
      error: 'Failed to fetch posts',
      details: error.message
    });
  }
}