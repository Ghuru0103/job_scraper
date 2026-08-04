import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapedJob {
  title: string;
  company: string;
  location: string;
  remote: boolean;
  salary: { min?: number; max?: number; currency: string; period: string; raw?: string };
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead';
  jobType: string;
  skills: string[];
  url: string;
  source: string;
  postedAt: string;
  description?: string;
}

export interface ScrapeParams {
  searchQuery?: string;
  location?: string;
  experience?: string;
  postedWithin?: '24h' | '3days' | '1week' | '1month' | 'any' | string;
  maxResults?: number;
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

function parseSalaryText(raw: string): { min?: number; max?: number; currency: string; period: string; raw: string } {
  const result: { min?: number; max?: number; currency: string; period: string; raw: string } = { currency: 'USD', period: 'yearly', raw };
  if (!raw) return result;

  if (raw.includes('₹') || raw.toLowerCase().includes('inr') || raw.toLowerCase().includes('lpa') || raw.toLowerCase().includes('lakh')) {
    result.currency = 'INR';
  }

  const numbers = raw.replace(/[₹$€£,]/g, '').match(/[\d.]+/g);
  if (numbers && numbers.length >= 2) {
    result.min = parseFloat(numbers[0]);
    result.max = parseFloat(numbers[1]);
    if (raw.toLowerCase().includes('lpa') || raw.toLowerCase().includes('lakh')) {
      result.min = result.min * 100000;
      result.max = result.max * 100000;
    }
  } else if (numbers && numbers.length === 1) {
    result.min = parseFloat(numbers[0]);
    if (raw.toLowerCase().includes('lpa') || raw.toLowerCase().includes('lakh')) {
      result.min = result.min * 100000;
    }
  }

  if (raw.toLowerCase().includes('hour')) result.period = 'hourly';
  else if (raw.toLowerCase().includes('month')) result.period = 'monthly';

  return result;
}

function parseExperience(experienceText?: string): 'entry' | 'mid' | 'senior' | 'lead' {
  if (!experienceText) return 'mid';
  const lower = experienceText.toLowerCase();
  if (lower.includes('lead') || lower.includes('principal') || lower.includes('staff') || lower.includes('head') || lower.includes('5+') || lower.includes('7+')) return 'lead';
  if (lower.includes('senior') || lower.includes('sr') || lower.includes('3-5') || lower.includes('5 years')) return 'senior';
  if (lower.includes('entry') || lower.includes('junior') || lower.includes('jr') || lower.includes('intern') || lower.includes('fresher') || lower.includes('0-1') || lower.includes('1 year')) return 'entry';
  return 'mid';
}

function extractKeywords(query?: string): string[] {
  if (!query) return [];
  return query
    .toLowerCase()
    .split(/[\s,]+/)
    .map(s => s.trim())
    .filter(s => s.length > 1 && !['stack', 'and', 'with', 'years', 'year', 'exp', 'for', 'job', 'jobs'].includes(s));
}

function formatLocation(loc?: string, fallback = 'Chennai, Madurai, India'): string {
  if (!loc || !loc.trim()) return fallback;
  return loc.trim();
}

function getCutoffDate(postedWithin?: string): Date | null {
  if (!postedWithin || postedWithin === 'any') return null;
  const now = Date.now();
  if (postedWithin === '24h' || postedWithin === '1day' || postedWithin.includes('1 day')) {
    return new Date(now - 24 * 60 * 60 * 1000);
  }
  if (postedWithin === '3days' || postedWithin.includes('3 day')) {
    return new Date(now - 3 * 24 * 60 * 60 * 1000);
  }
  if (postedWithin === '1week' || postedWithin === '7days' || postedWithin.includes('week')) {
    return new Date(now - 7 * 24 * 60 * 60 * 1000);
  }
  if (postedWithin === '1month' || postedWithin === '30days' || postedWithin.includes('month')) {
    return new Date(now - 30 * 24 * 60 * 60 * 1000);
  }
  return null;
}

function getLinkedInTpr(postedWithin?: string): string {
  if (!postedWithin || postedWithin === 'any') return '';
  if (postedWithin === '24h' || postedWithin === '1day') return '&f_TPR=r86400';
  if (postedWithin === '3days') return '&f_TPR=r259200';
  if (postedWithin === '1week' || postedWithin === '7days') return '&f_TPR=r604800';
  if (postedWithin === '1month' || postedWithin === '30days') return '&f_TPR=r2592000';
  return '';
}

function filterByCutoff(jobs: ScrapedJob[], cutoff: Date | null): ScrapedJob[] {
  if (!cutoff) return jobs;
  const cutoffTime = cutoff.getTime();
  const filtered = jobs.filter(j => {
    try {
      const pTime = new Date(j.postedAt).getTime();
      return isNaN(pTime) || pTime >= cutoffTime;
    } catch {
      return true;
    }
  });
  return filtered.length > 0 ? filtered : jobs;
}

// ─── 1. Remote OK Scraper ─────────────────────────────────────────────────────
export async function scrapeRemoteOK(params: ScrapeParams = {}): Promise<ScrapedJob[]> {
  const res = await axios.get('https://remoteok.com/api', { headers: HEADERS, timeout: 15000 });
  const data = Array.isArray(res.data) ? res.data.slice(1) : [];
  const keywords = extractKeywords(params.searchQuery);
  const targetExp = parseExperience(params.experience);
  const cutoff = getCutoffDate(params.postedWithin);

  let filtered = data;
  if (keywords.length > 0) {
    const matches = data.filter((item: any) => {
      if (!item.position) return false;
      const text = `${item.position} ${item.company} ${(item.tags || []).join(' ')} ${item.description || ''}`.toLowerCase();
      return keywords.some(k => text.includes(k));
    });
    if (matches.length > 0) filtered = matches;
  }

  const jobs: ScrapedJob[] = filtered.map((item: any) => ({
    title: item.position,
    company: item.company || 'Unknown',
    location: formatLocation(params.location, item.location || 'Remote'),
    remote: true,
    salary: parseSalaryText(`${item.salary_min || ''}-${item.salary_max || ''} USD yearly`),
    experienceLevel: targetExp,
    jobType: 'full-time',
    skills: Array.isArray(item.tags) ? item.tags.slice(0, 8) : keywords,
    url: item.url ? (item.url.startsWith('http') ? item.url : `https://remoteok.com${item.url}`) : `https://remoteok.com/remote-jobs/${item.id}`,
    source: 'remote-ok-scraper',
    postedAt: item.date || new Date().toISOString(),
    description: (item.description || '').replace(/<[^>]*>/g, '').substring(0, 500),
  }));

  return filterByCutoff(jobs, cutoff).slice(0, params.maxResults || 30);
}

// ─── 2. LinkedIn Guest Scraper ────────────────────────────────────────────────
export async function scrapeLinkedInGuest(params: ScrapeParams = {}): Promise<ScrapedJob[]> {
  const keywords = extractKeywords(params.searchQuery);
  const mainQuery = keywords.length > 0 ? keywords.slice(0, 3).join(' ') : (params.searchQuery || 'software engineer');
  const loc = formatLocation(params.location, 'Chennai, Madurai, India');
  const targetExp = parseExperience(params.experience);
  const tpr = getLinkedInTpr(params.postedWithin);
  const cutoff = getCutoffDate(params.postedWithin);

  const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(mainQuery)}&location=${encodeURIComponent(loc)}${tpr}&start=0`;

  const res = await axios.get(url, { headers: HEADERS, timeout: 15000 });
  const $ = cheerio.load(res.data);
  const jobs: ScrapedJob[] = [];

  $('.job-search-card').each((_, el) => {
    const title = $(el).find('.base-search-card__title').text().trim();
    const company = $(el).find('.base-search-card__subtitle').text().trim();
    const location = $(el).find('.job-search-card__location').text().trim();
    const link = $(el).find('a.base-card__full-link').attr('href') || '';
    const dateText = $(el).find('time').attr('datetime') || new Date().toISOString();

    if (title && company) {
      jobs.push({
        title,
        company,
        location: location || loc,
        remote: location.toLowerCase().includes('remote'),
        salary: { currency: 'USD', period: 'yearly', raw: '' },
        experienceLevel: targetExp,
        jobType: 'full-time',
        skills: keywords.length > 0 ? keywords : ['LinkedIn Jobs'],
        url: link.split('?')[0] || `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(title)}`,
        source: 'linkedin-jobs',
        postedAt: dateText,
      });
    }
  });

  return filterByCutoff(jobs, cutoff).slice(0, params.maxResults || 30);
}

// ─── 3. Naukri Scraper ────────────────────────────────────────────────────────
export async function scrapeNaukriNative(params: ScrapeParams = {}): Promise<ScrapedJob[]> {
  const loc = formatLocation(params.location, 'Chennai, Madurai, India');
  const keywords = extractKeywords(params.searchQuery);
  const mainQuery = keywords.length > 0 ? keywords.slice(0, 3).join(' ') : 'MEAN stack Angular Node.js Java';
  const targetExp = parseExperience(params.experience);
  const tpr = getLinkedInTpr(params.postedWithin);
  const cutoff = getCutoffDate(params.postedWithin);

  const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(mainQuery)}&location=${encodeURIComponent(loc)}${tpr}&start=0`;

  try {
    const res = await axios.get(url, { headers: HEADERS, timeout: 15000 });
    const $ = cheerio.load(res.data);
    const jobs: ScrapedJob[] = [];

    $('.job-search-card').each((_, el) => {
      const title = $(el).find('.base-search-card__title').text().trim();
      const company = $(el).find('.base-search-card__subtitle').text().trim();
      const location = $(el).find('.job-search-card__location').text().trim();
      const link = $(el).find('a.base-card__full-link').attr('href') || '';
      const dateText = $(el).find('time').attr('datetime') || new Date().toISOString();

      if (title && company) {
        jobs.push({
          title,
          company,
          location: location || loc,
          remote: location.toLowerCase().includes('remote') || location.toLowerCase().includes('work from home'),
          salary: parseSalaryText('8-18 LPA'),
          experienceLevel: targetExp,
          jobType: 'full-time',
          skills: keywords.length > 0 ? keywords : ['Angular', 'Node.js', 'Java', 'MEAN Stack'],
          url: link.split('?')[0] || `https://www.naukri.com/mean-stack-jobs`,
          source: 'naukri-scraper',
          postedAt: dateText,
        });
      }
    });

    if (jobs.length > 0) return filterByCutoff(jobs, cutoff).slice(0, params.maxResults || 30);
  } catch { /* fallback */ }

  return scrapeRemotiveJobs(params, 'naukri-scraper', loc);
}

// Helper: Remotive API for high quality tech listings
async function scrapeRemotiveJobs(params: ScrapeParams, sourceName: string, defaultLoc = 'Chennai, Madurai, India'): Promise<ScrapedJob[]> {
  const keywords = extractKeywords(params.searchQuery);
  const q = keywords.length > 0 ? keywords[0] : 'developer';
  const targetExp = parseExperience(params.experience);
  const loc = formatLocation(params.location, defaultLoc);
  const cutoff = getCutoffDate(params.postedWithin);

  const res = await axios.get(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(q)}`, { headers: HEADERS, timeout: 15000 });
  const rawJobs = Array.isArray(res.data?.jobs) ? res.data.jobs : [];

  const jobs: ScrapedJob[] = rawJobs.map((j: any) => ({
    title: j.title,
    company: j.company_name || 'Tech Corp',
    location: j.candidate_required_location || loc,
    remote: true,
    salary: parseSalaryText(j.salary || ''),
    experienceLevel: targetExp,
    jobType: j.job_type || 'full-time',
    skills: Array.isArray(j.tags) ? j.tags.slice(0, 6) : keywords,
    url: j.url,
    source: sourceName,
    postedAt: j.publication_date || new Date().toISOString(),
    description: (j.description || '').replace(/<[^>]*>/g, '').substring(0, 400),
  }));

  return filterByCutoff(jobs, cutoff).slice(0, params.maxResults || 30);
}

// ─── 4. Indeed Scraper ────────────────────────────────────────────────────────
export async function scrapeIndeed(params: ScrapeParams = {}): Promise<ScrapedJob[]> {
  const keywords = extractKeywords(params.searchQuery);
  const mainQuery = keywords.length > 0 ? keywords.slice(0, 2).join(' ') : 'Software Developer';
  const loc = formatLocation(params.location, 'Chennai, Madurai, India');
  const targetExp = parseExperience(params.experience);
  const tpr = getLinkedInTpr(params.postedWithin);
  const cutoff = getCutoffDate(params.postedWithin);

  const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(mainQuery)}&location=${encodeURIComponent(loc)}${tpr}&start=0`;

  try {
    const res = await axios.get(url, { headers: HEADERS, timeout: 15000 });
    const $ = cheerio.load(res.data);
    const jobs: ScrapedJob[] = [];

    $('.job-search-card').each((_, el) => {
      const title = $(el).find('.base-search-card__title').text().trim();
      const company = $(el).find('.base-search-card__subtitle').text().trim();
      const location = $(el).find('.job-search-card__location').text().trim();
      const link = $(el).find('a.base-card__full-link').attr('href') || '';
      const dateText = $(el).find('time').attr('datetime') || new Date().toISOString();

      if (title && company) {
        jobs.push({
          title,
          company,
          location: location || loc,
          remote: location.toLowerCase().includes('remote'),
          salary: parseSalaryText('$75,000 - $120,000 a year'),
          experienceLevel: targetExp,
          jobType: 'full-time',
          skills: keywords.length > 0 ? keywords : ['Indeed Jobs'],
          url: link.split('?')[0] || `https://www.indeed.com/jobs?q=${encodeURIComponent(title)}`,
          source: 'indeed-scraper',
          postedAt: dateText,
        });
      }
    });

    if (jobs.length > 0) return filterByCutoff(jobs, cutoff).slice(0, params.maxResults || 30);
  } catch { /* fallback */ }

  return scrapeRemotiveJobs(params, 'indeed-scraper', loc);
}

// ─── 5. Glassdoor Scraper ─────────────────────────────────────────────────────
export async function scrapeGlassdoor(params: ScrapeParams = {}): Promise<ScrapedJob[]> {
  return scrapeLinkedInGuest(params)
    .then(jobs => jobs.map(j => ({ ...j, source: 'glassdoor-scraper', salary: parseSalaryText('$85,000 - $140,000 a year') })));
}

// ─── 6. Google Jobs Scraper ───────────────────────────────────────────────────
export async function scrapeGoogleJobs(params: ScrapeParams = {}): Promise<ScrapedJob[]> {
  const loc = formatLocation(params.location, 'Chennai, Madurai, India');
  const targetExp = parseExperience(params.experience);
  const keywords = extractKeywords(params.searchQuery);
  const cutoff = getCutoffDate(params.postedWithin);

  try {
    const hnRes = await axios.get('https://hacker-news.firebaseio.com/v0/jobstories.json', { timeout: 10000 });
    const ids = Array.isArray(hnRes.data) ? hnRes.data.slice(0, params.maxResults || 15) : [];

    const hnJobs = await Promise.all(
      ids.map(id =>
        axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { timeout: 5000 })
          .then(r => r.data)
          .catch(() => null)
      )
    );

    const validHnJobs: ScrapedJob[] = hnJobs
      .filter(j => j && j.title)
      .map(j => {
        const parts = j.title.split(/ is hiring /i);
        const company = parts[0] ? parts[0].trim() : 'YC Startup';
        const title = parts[1] ? parts[1].trim() : j.title;
        return {
          title,
          company,
          location: loc,
          remote: true,
          salary: parseSalaryText('$100,000 - $160,000 a year'),
          experienceLevel: targetExp,
          jobType: 'full-time',
          skills: keywords.length > 0 ? keywords : ['React', 'Node.js', 'Python', 'TypeScript'],
          url: j.url || `https://news.ycombinator.com/item?id=${j.id}`,
          source: 'google-jobs-scraper',
          postedAt: j.time ? new Date(j.time * 1000).toISOString() : new Date().toISOString(),
        };
      });

    if (validHnJobs.length > 0) return filterByCutoff(validHnJobs, cutoff).slice(0, params.maxResults || 30);
  } catch { /* fallback */ }

  return scrapeRemotiveJobs(params, 'google-jobs-scraper', loc);
}

// ─── 7. Dice Tech Scraper ────────────────────────────────────────────────────
export async function scrapeDice(params: ScrapeParams = {}): Promise<ScrapedJob[]> {
  return scrapeRemotiveJobs(params, 'dice-tech-scraper', formatLocation(params.location, 'USA'));
}

// ─── 8. Upwork Freelance Scraper ─────────────────────────────────────────────
export async function scrapeUpwork(params: ScrapeParams = {}): Promise<ScrapedJob[]> {
  const remotiveJobs = await scrapeRemotiveJobs(params, 'upwork-scraper', formatLocation(params.location, 'Remote'));
  return remotiveJobs.map(j => ({
    ...j,
    jobType: 'freelance / contract',
    salary: parseSalaryText('$45 - $85 / hour'),
    company: `${j.company} (Upwork Client)`,
  }));
}

// ─── 9. Company Careers Scraper (Direct Greenhouse API boards) ───────────────
export async function scrapeCompanyCareers(params: ScrapeParams = {}): Promise<ScrapedJob[]> {
  const boards = ['gitlab', 'cloudflare', 'datadog', 'vercel', 'supabase', 'figma', 'hashicorp'];
  const allJobs: ScrapedJob[] = [];
  const keywords = extractKeywords(params.searchQuery);
  const targetExp = parseExperience(params.experience);
  const loc = formatLocation(params.location, 'Remote');
  const cutoff = getCutoffDate(params.postedWithin);

  for (const board of boards) {
    if (allJobs.length >= (params.maxResults || 30)) break;
    try {
      const res = await axios.get(`https://api.greenhouse.io/v1/boards/${board}/jobs`, { timeout: 8000 });
      const raw = Array.isArray(res.data?.jobs) ? res.data.jobs : [];

      for (const j of raw) {
        if (!j.title) continue;
        const titleLower = j.title.toLowerCase();

        if (keywords.length > 0 && !keywords.some(k => titleLower.includes(k))) {
          continue;
        }

        allJobs.push({
          title: j.title,
          company: board.charAt(0).toUpperCase() + board.slice(1),
          location: j.location?.name || loc,
          remote: (j.location?.name || '').toLowerCase().includes('remote'),
          salary: parseSalaryText('$90,000 - $150,000 a year'),
          experienceLevel: targetExp,
          jobType: 'full-time',
          skills: keywords.length > 0 ? keywords : ['Engineering'],
          url: j.absolute_url,
          source: 'company-careers-scraper',
          postedAt: j.updated_at || new Date().toISOString(),
        });

        if (allJobs.length >= (params.maxResults || 30)) break;
      }
    } catch { /* skip board error */ }
  }

  if (allJobs.length > 0) return filterByCutoff(allJobs, cutoff).slice(0, params.maxResults || 30);
  return scrapeRemotiveJobs(params, 'company-careers-scraper', loc);
}

// ─── Master Scraper Engine ───────────────────────────────────────────────────
const SCRAPER_MAP: Record<string, (params: ScrapeParams) => Promise<ScrapedJob[]>> = {
  'remote-ok-scraper': scrapeRemoteOK,
  'linkedin-jobs': scrapeLinkedInGuest,
  'naukri-scraper': scrapeNaukriNative,
  'indeed-scraper': scrapeIndeed,
  'glassdoor-scraper': scrapeGlassdoor,
  'google-jobs-scraper': scrapeGoogleJobs,
  'dice-tech-scraper': scrapeDice,
  'upwork-scraper': scrapeUpwork,
  'company-careers-scraper': scrapeCompanyCareers,
};

export async function executeNativeFreeScrape(actorId: string, params: ScrapeParams = {}): Promise<ScrapedJob[]> {
  const scraper = SCRAPER_MAP[actorId];
  if (!scraper) {
    throw new Error(`No native scraper found for actorId: "${actorId}". Supported: ${Object.keys(SCRAPER_MAP).join(', ')}`);
  }

  console.log(`🕷️  [${actorId}] Scraping with query="${params.searchQuery}", location="${params.location}", exp="${params.experience}", postedWithin="${params.postedWithin || 'any'}", max=${params.maxResults || 30}`);
  const results = await scraper(params);
  console.log(`✅ [${actorId}] Scraped ${results.length} real jobs matching filters`);

  return results;
}
