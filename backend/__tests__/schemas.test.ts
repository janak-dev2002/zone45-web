import {
  loginBodySchema,
  contactBodySchema,
  portfolioBodySchema,
  postBodySchema,
  uploadSignBodySchema,
  paginationSchema,
} from '../src/lib/schemas';

describe('loginBodySchema', () => {
  it('accepts valid login', () => {
    const result = loginBodySchema.safeParse({
      email: 'admin@zoneforty5.tech',
      password: 'securepassword',
      turnstileToken: 'valid_token',
    });
    expect(result.success).toBe(true);
  });

  it('rejects short password', () => {
    const result = loginBodySchema.safeParse({
      email: 'admin@zoneforty5.tech',
      password: 'short',
      turnstileToken: 'token',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = loginBodySchema.safeParse({
      email: 'not-an-email',
      password: 'validpassword',
      turnstileToken: 'token',
    });
    expect(result.success).toBe(false);
  });
});

describe('contactBodySchema', () => {
  const valid = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    subject: 'Hello',
    message: 'This is a test message with enough length.',
    hpField: '',
    turnstileToken: 'token123',
  };

  it('accepts valid contact form', () => {
    expect(contactBodySchema.safeParse(valid).success).toBe(true);
  });

  it('rejects name over 100 chars', () => {
    const result = contactBodySchema.safeParse({ ...valid, name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('rejects message under 10 chars', () => {
    const result = contactBodySchema.safeParse({ ...valid, message: 'short' });
    expect(result.success).toBe(false);
  });

  it('rejects message over 5000 chars', () => {
    const result = contactBodySchema.safeParse({ ...valid, message: 'a'.repeat(5001) });
    expect(result.success).toBe(false);
  });

  it('trims name and subject', () => {
    const result = contactBodySchema.safeParse({ ...valid, name: '  Jane  ', subject: '  Hello  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Jane');
      expect(result.data.subject).toBe('Hello');
    }
  });
});

describe('portfolioBodySchema', () => {
  const valid = {
    slug: 'my-project',
    title: 'My Project',
    description: 'A short description',
    body: '# Body content',
    techStack: ['Go', 'PostgreSQL'],
    published: false,
  };

  it('accepts valid portfolio entry', () => {
    expect(portfolioBodySchema.safeParse(valid).success).toBe(true);
  });

  it('rejects slug starting with hyphen', () => {
    expect(portfolioBodySchema.safeParse({ ...valid, slug: '-bad-slug' }).success).toBe(false);
  });

  it('rejects slug with uppercase', () => {
    expect(portfolioBodySchema.safeParse({ ...valid, slug: 'Bad-Slug' }).success).toBe(false);
  });

  it('rejects title over 200 chars', () => {
    expect(portfolioBodySchema.safeParse({ ...valid, title: 'a'.repeat(201) }).success).toBe(false);
  });

  it('rejects techStack with more than 30 items', () => {
    expect(portfolioBodySchema.safeParse({ ...valid, techStack: new Array(31).fill('Go') }).success).toBe(false);
  });

  it('defaults sortOrder to 0', () => {
    const result = portfolioBodySchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.sortOrder).toBe(0);
  });
});

describe('postBodySchema', () => {
  const valid = {
    slug: 'my-post',
    title: 'My Post',
    excerpt: 'A short excerpt',
    body: '# Post body',
    published: false,
    tags: ['ai', 'process'],
  };

  it('accepts valid post', () => {
    expect(postBodySchema.safeParse(valid).success).toBe(true);
  });

  it('rejects more than 10 tags', () => {
    expect(postBodySchema.safeParse({ ...valid, tags: new Array(11).fill('tag') }).success).toBe(false);
  });

  it('rejects body over 100000 chars', () => {
    expect(postBodySchema.safeParse({ ...valid, body: 'a'.repeat(100001) }).success).toBe(false);
  });
});

describe('uploadSignBodySchema', () => {
  it('accepts valid jpeg upload request', () => {
    const result = uploadSignBodySchema.safeParse({
      filename: 'photo.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 1024 * 1024,
    });
    expect(result.success).toBe(true);
  });

  it('rejects disallowed content type', () => {
    const result = uploadSignBodySchema.safeParse({
      filename: 'file.pdf',
      contentType: 'application/pdf',
      sizeBytes: 1024,
    });
    expect(result.success).toBe(false);
  });

  it('rejects file over 5MB', () => {
    const result = uploadSignBodySchema.safeParse({
      filename: 'huge.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 5 * 1024 * 1024 + 1,
    });
    expect(result.success).toBe(false);
  });
});

describe('paginationSchema', () => {
  it('defaults to page 1, pageSize 20', () => {
    const result = paginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
    }
  });

  it('rejects pageSize above 100', () => {
    expect(paginationSchema.safeParse({ pageSize: 101 }).success).toBe(false);
  });

  it('coerces string numbers', () => {
    const result = paginationSchema.safeParse({ page: '2', pageSize: '50' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.pageSize).toBe(50);
    }
  });
});
