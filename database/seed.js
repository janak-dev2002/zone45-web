const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Seed Admin User
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@zoneforty5.tech';
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH || '$argon2id$v=19$m=65536,t=3,p=4$c2FtcGxlc2VlZA$yourpasswordhash'; // placeholder
    const adminName = process.env.ADMIN_NAME || 'Admin';

    await client.query(`
      INSERT INTO admin_users (email, password_hash, name)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO NOTHING
    `, [adminEmail, adminPasswordHash, adminName]);

    console.log('Admin user seeded.');

    // 2. Seed Tags
    const tags = [
      { slug: 'react', name: 'React' },
      { slug: 'typescript', name: 'TypeScript' },
      { slug: 'nodejs', name: 'Node.js' }
    ];

    const tagIds = [];
    for (const tag of tags) {
      const res = await client.query(`
        INSERT INTO tags (slug, name)
        VALUES ($1, $2)
        ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `, [tag.slug, tag.name]);
      tagIds.push(res.rows[0].id);
    }
    console.log('Tags seeded.');

    // 3. Seed Portfolio Projects
    const projects = [
      {
        slug: 'ai-analytics-dashboard',
        title: 'AI Analytics Dashboard',
        description: 'A real-time dashboard for AI performance monitoring.',
        body: 'Full body content for AI Analytics Dashboard...',
        tech_stack: JSON.stringify(['React', 'Node.js', 'PostgreSQL']),
        outcome: 'Increased monitoring efficiency by 40%.',
        project_url: 'https://example.com/project1',
        sort_order: 1,
        published: true
      },
      {
        slug: 'blockchain-supply-chain',
        title: 'Blockchain Supply Chain',
        description: 'Transparent supply chain tracking using blockchain.',
        body: 'Full body content for Blockchain Supply Chain...',
        tech_stack: JSON.stringify(['Solidity', 'React', 'TypeScript']),
        outcome: 'Reduced fraud by 25% in pilot phase.',
        project_url: 'https://example.com/project2',
        sort_order: 2,
        published: true
      },
      {
        slug: 'e-commerce-engine',
        title: 'E-commerce Engine',
        description: 'High-performance headless e-commerce backend.',
        body: 'Full body content for E-commerce Engine...',
        tech_stack: JSON.stringify(['Node.js', 'Redis', 'PostgreSQL']),
        outcome: 'Handles 10k+ requests per second.',
        project_url: 'https://example.com/project3',
        sort_order: 3,
        published: true
      }
    ];

    for (const project of projects) {
      await client.query(`
        INSERT INTO portfolio_projects (slug, title, description, body, tech_stack, outcome, project_url, sort_order, published)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (slug) DO UPDATE SET 
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          body = EXCLUDED.body,
          tech_stack = EXCLUDED.tech_stack,
          outcome = EXCLUDED.outcome,
          project_url = EXCLUDED.project_url,
          sort_order = EXCLUDED.sort_order,
          published = EXCLUDED.published
      `, [project.slug, project.title, project.description, project.body, project.tech_stack, project.outcome, project.project_url, project.sort_order, project.published]);
    }
    console.log('Portfolio projects seeded.');

    // 4. Seed Blog Posts
    const posts = [
      {
        slug: 'future-of-ai-development',
        title: 'The Future of AI Development',
        excerpt: 'Exploring how AI is shaping the software engineering landscape.',
        body: 'Detailed blog post about AI...',
        published: true,
        published_at: new Date()
      },
      {
        slug: 'scaling-nodejs-applications',
        title: 'Scaling Node.js Applications',
        excerpt: 'Best practices for handling high traffic in Node.js.',
        body: 'Detailed blog post about scaling...',
        published: true,
        published_at: new Date()
      },
      {
        slug: 'mastering-typescript',
        title: 'Mastering TypeScript',
        excerpt: 'Deep dive into advanced TypeScript types and features.',
        body: 'Detailed blog post about TypeScript...',
        published: true,
        published_at: new Date()
      }
    ];

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      const res = await client.query(`
        INSERT INTO blog_posts (slug, title, excerpt, body, published, published_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (slug) DO UPDATE SET
          title = EXCLUDED.title,
          excerpt = EXCLUDED.excerpt,
          body = EXCLUDED.body,
          published = EXCLUDED.published,
          published_at = EXCLUDED.published_at
        RETURNING id
      `, [post.slug, post.title, post.excerpt, post.body, post.published, post.published_at]);
      
      const postId = res.rows[0].id;
      // Associate each post with the 'typescript' or 'nodejs' or 'react' tag for variety
      const tagId = tagIds[i % tagIds.length];
      await client.query(`
        INSERT INTO post_tags (post_id, tag_id)
        VALUES ($1, $2)
        ON CONFLICT (post_id, tag_id) DO NOTHING
      `, [postId, tagId]);
    }
    console.log('Blog posts and tag associations seeded.');

    await client.query('COMMIT');
    console.log('Seeding completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during seeding:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
