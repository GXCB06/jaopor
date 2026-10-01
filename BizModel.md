I'll look at JaoPor first, then map what fits from TrustMRR's model.

JaoPor already copies TrustMRR's best idea, which is showing numbers pulled straight from the system instead of screenshots. Your users are different from TrustMRR's, though, so the business model should be different too.

## Where JaoPor stands against TrustMRR

|                            | TrustMRR                                             | JaoPor today                                                                      |
| -------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| Who it's for               | Global indie hackers, many already earning money     | Thai builders making web apps, mobile apps and LINE OA with AI                    |
| What gets verified         | Revenue only                                         | Revenue, users and visitors, from Stripe, RevenueCat, Plausible, Umami and GitHub |
| Main thing people do there | Buy and sell startups                                | Show off their work and get discovered                                            |
| Audience                   | Marc Lou's following on X, about 200K visits a month | Not built yet. Claude Thailand Community would be your first channel              |
| Live data                  | Thousands of startups                                | One real listing (JaoPor itself, ฿0) plus demo listings                           |

Your strongest difference is that you verify visitors and commits, not just revenue. Most Thai AI builders, especially those in a Claude community, have no revenue yet. TrustMRR has nothing to offer them. JaoPor can say: "you don't need revenue to prove your work is real."

## What your users actually need

Think about why a Thai builder would list on JaoPor:

1. **Credibility for getting hired or getting clients.** A verified portfolio shows "I can ship things that real people use." This is likely the strongest need.
2. **Recognition and a place to show off.** The province Olympics and leaderboard tap into this well.
3. **Their first users and feedback.** Early projects need traffic more than they need a buyer.
4. **Selling the project.** This matters much less than on TrustMRR, because Thailand has few buyers for small digital businesses.

So copying TrustMRR's marketplace-first approach is risky. You don't have deal flow yet, and in Thailand it may never be large.

## Recommended model in three phases

### Phase 1: Launch in Claude Thailand Community (free, the goal is listings)

Charge nothing. The goal is to reach 50–100 real verified listings, because the data is the asset, just as it was for TrustMRR.

- Add a **"Built with Claude"** tag or a community leaderboard so community members feel the site is theirs.
- Hold a **monthly "JaoPor of the Month"** and announce it in the community. It costs you nothing and pulls in new listings.
- Offer an **embeddable verified badge** that builders can put on their sites, which brings backlinks and free reach.
- Make **pre-revenue entry** easy: connecting just GitHub and Umami or Plausible should be enough for a listing.

### Phase 2: Charge for visibility, mostly to sponsors rather than builders

Once you have traffic, use the same structure as TrustMRR but with Thai pricing. Thai builders have little money, while companies that want to reach them do have budgets. Indicative prices:

- **Featured spot or boost** for builders: roughly ฿199–490 per week, or a one-time fee
- **Sponsor slot** for companies such as AI tools, hosting providers, payment gateways, bootcamps and Thai SaaS firms: roughly ฿3,000–15,000 per month. This is likely your biggest revenue source at first, just as sponsors were for TrustMRR.
- **"State of Thai AI Builders" report** each quarter, compiled from your data and sold as sponsorship or a branded report. This kind of data is rare in Thailand.

### Phase 3: Earn from transactions that fit Thailand

Rather than relying only on startup sales, consider matching that solves the needs above:

- **Thai SMEs hiring builders.** For example, a shop wants a LINE OA or an AI automation built, so it finds a builder with a verified portfolio on JaoPor. You could charge the SME a commission of 5–10% or a lead fee. In Thailand this market is probably far larger than buying and selling startups.
- **Talent and job matching.** Companies looking for AI-native developers could pay a monthly fee to search builders by verified data.
- **Small project sales.** Launch this once real projects have revenue, with a flat 3% fee like TrustMRR. Expect small deals of roughly ฿20,000–200,000. You'd need a trusted escrow arrangement that suits Thailand.

## Fix before launching in the community

- **Demo data at the top of the leaderboard.** A site whose pitch is "real numbers" showing sample data at the top undermines trust. Hide demo listings once you have about five real ones, or show them only in an "example" section.
- **Thai payment rails.** Many Thai products collect money through PromptPay, bank transfer or Opn (Omise), which Stripe doesn't cover. Without them, you can't verify most Thai revenue. Supporting Opn, or verifying LINE OA follower counts through LINE's API, would be a strong local advantage.
- **Domain.** A trust product hosted on vercel.app looks unfinished. Your footer already mentions JaoPor.dev, so move it there before launch.
- **Your own listing.** Add yourself as the founder on JaoPor's own page to show you're "building in public" yourself.

The most important thing for the community launch is not monetizing yet. Get 20 Claude Thailand Community members to verify their projects in the first week, and you'll have both the data and the social proof you need for Phase 2.

If you'd like, I can draft the launch post for Claude Thailand Community in Thai, or turn this into a doc for your team.
.
.
.

# JaoPor — Business Model

> **JaoPor (เจ้าพ่อ):** the permanent home for things Thai people build with AI (web, apps, LINE OA), with revenue and usage verified directly from the source, not screenshots.

_Last updated: 1 October 2026 · Benchmark: TrustMRR (trustmrr.com)_

---

## 1. Positioning

|                            | TrustMRR                                            | JaoPor                                                                              |
| -------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Target                     | Global indie hackers, many already earning          | Thai builders making web apps, mobile apps and LINE OA with AI, mostly early stage  |
| What gets verified         | Revenue only                                        | Revenue, visitors, users and commits (Stripe, RevenueCat, Plausible, Umami, GitHub) |
| Main thing people do there | Buy and sell startups                               | Show off work, get discovered, get hired or get clients                             |
| Distribution               | Founder's following on X, about 200K visits a month | Claude Thailand Community first, then the wider Thai builder scene                  |
| Currency / language        | USD / English                                       | THB + USD / Thai + English                                                          |

**Core differentiator:** _You don't need revenue to prove your work is real._
Visitors, users and commits count as verified traction, so the 90%+ of Thai AI builders who are pre-revenue have a reason to list. TrustMRR doesn't serve them.

### Thai competitors

|                  | SaaSThai (saasthai.com)                                            | Ploykhong / ปล่อยของ (ploykhong.app)                            | JaoPor                                           |
| ---------------- | ------------------------------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------ |
| Model            | Directory + reviews + votes (G2 / Product Hunt style)              | App gallery to discover and try apps (Product Hunt style)       | Verified traction database                       |
| Main audience    | Thai businesses choosing software, plus SaaS makers                | Thai users and makers; strong #ClaudeCode / #VibeCoding culture | Thai AI builders, then SMEs, sponsors and buyers |
| Scale (Oct 2026) | ~191 products, 19 categories                                       | Dozens of apps; Editor's Choice curation                        | 1 real listing + demos                           |
| Metrics shown    | Votes, reviews, pricing type. Maker identity verified, numbers not | Votes, tags, beta status. No numbers                            | Verified revenue, MRR, visitors, users, commits  |
| Extras           | Partner matching (co-marketing), hire creators, collections, blog  | Beta-tester recruiting, makers to follow, "hidden gems"         | Leaderboard, province Olympics                   |
| Monetization     | None visible; free for all                                         | None visible                                                    | Planned (see §4)                                 |
| Engagement       | Low (single-digit votes per product)                               | Low (single-digit votes per app)                                | n/a                                              |

**Takeaways**

- **Nobody verifies numbers.** That lane is open, and it is JaoPor's only defensible difference.
- **Don't compete on discovery or launches.** Ploykhong owns the "launch moment" for Claude builders; SaaSThai owns "find Thai software for my business."
- **Ploykhong overlaps most with the launch channel.** Claude Thailand Community builders already post there with #ClaudeCode. JaoPor must answer "why list again?"
- **SaaSThai already does partner and hiring matching**, so Phase 3 matching must lean on verified data to be different.
- **Free is the market norm** and engagement is thin everywhere. Sponsors, not builders, remain the realistic payers; keep costs low and consider ASEAN expansion later.

**Positioning line:** _ปล่อยของ คือที่เปิดตัว · JaoPor คือที่พิสูจน์ว่าโตจริง_
(Ploykhong is where you launch. JaoPor is where you prove it's actually growing.)

**Coopetition, not war:** builders list everywhere because listing is free. Make JaoPor complementary:

- One-click import from a Ploykhong or SaaSThai link
- A "JaoPor Verified" badge builders can show on their Ploykhong / SaaSThai pages and own sites
- Offer verified-data partnerships to both platforms (JaoPor as the verification layer)

---

## 2. What users need, and how JaoPor serves it

| #   | Need                                    | How JaoPor serves it                                           | Priority     |
| --- | --------------------------------------- | -------------------------------------------------------------- | ------------ |
| 1   | Credibility to get hired or win clients | A verified portfolio that proves "I ship things people use"    | High         |
| 2   | Recognition and bragging rights         | Leaderboard, province Olympics, "JaoPor of the Month"          | High         |
| 3   | First users and feedback                | Discovery by category, featured placement, community showcases | Medium       |
| 4   | Selling a project                       | Small-deal marketplace (later)                                 | Low, for now |

**Implication:** Build the business around needs 1–3. Treat acquisitions as an add-on, not the core, because there are few buyers for small digital businesses in Thailand.

---

## 3. Revenue model, phased

### Phase 1: Launch (free, the goal is listings)

**Channel:** Claude Thailand Community
**Revenue:** ฿0, deliberately
**Goal:** 50–100 real verified listings

The data is the asset. Every free listing adds to the dataset, brings backlinks and sharing, and builds inventory for later phases.

Growth tactics:

- **"Built with Claude"** tag and a community leaderboard, so members feel the site is theirs
- **"JaoPor of the Month"**, announced in the community
- **Embeddable verified badge** for builders' sites, bringing backlinks and free reach
- **Easy pre-revenue entry**: GitHub plus Umami or Plausible is enough to list
- Province Olympics as a shareable, regional-pride hook

### Phase 2: Charge for visibility, mostly to sponsors

**Trigger:** steady traffic and around 100 real listings

| Product                                                         | Buyer                                                     | Indicative price                     |
| --------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------ |
| Featured spot / boost                                           | Builders                                                  | ฿199–490 per week, or one-time       |
| Dofollow authority link                                         | Builders                                                  | One-time, about ฿390                 |
| Sponsor slot (site-wide panel + newsletter / LINE OA broadcast) | AI tools, hosting, payment gateways, bootcamps, Thai SaaS | ฿3,000–15,000 per month              |
| "State of Thai AI Builders" quarterly report                    | Sponsors, corporates, agencies, investors                 | Sponsorship or a paid branded report |

> Thai builders have little money; companies that want to reach them have budgets. **Sponsors are expected to be the largest early revenue source**, as they were for TrustMRR.

### Phase 3: Earn from transactions that fit Thailand

**Trigger:** a trusted brand and enough verified builders

| Product                    | How it works                                                                                      | Fee                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **SME → builder matching** | A Thai SME needs a LINE OA, automation or AI tool, then hires a builder with a verified portfolio | 5–10% commission or a per-lead fee, paid by the SME |
| **Talent search**          | Companies search builders by verified data and skills                                             | Monthly subscription                                |
| **Small project sales**    | List a project for sale; deals typically ฿20,000–200,000                                          | Flat 3% closing fee + listing tiers                 |
| **Data / API access**      | Investors, researchers, media                                                                     | Free tier + paid API                                |

> SME matching is likely a bigger market in Thailand than buying and selling startups, and it directly serves user need #1.

---

## 4. Revenue mix (target state)

| Stream                             | Share of revenue (target) |
| ---------------------------------- | ------------------------- |
| Sponsors and reports               | ~40%                      |
| SME matching and talent search     | ~30%                      |
| Builder visibility (boosts, links) | ~20%                      |
| Marketplace closing fees           | ~10%                      |

_Benchmark insight: TrustMRR earns an estimated 90%+ from listings, add-ons and sponsors, not deal commissions (182 deals, ~$1.1M volume, ~$5.8K average deal in 12 months)._

---

## 5. Moat

1. **Verified data that's hard to fake**: direct API connections, not screenshots
2. **Local verification rails** that global players won't build (see §6)
3. **Pre-revenue traction metrics**, covering builders TrustMRR ignores
4. **Community ownership** that starts with Claude Thailand Community
5. **Thai-first UX**: THB, Thai language, provinces, LINE OA as a first-class product type

---

## 6. Pre-launch checklist

- [ ] **Hide demo listings** once there are about 5 real ones. Demo data at the top of the leaderboard undermines the "real numbers" promise.
- [ ] **Add Thai payment rails**: Opn (Omise) first; explore PromptPay and bank-transfer verification
- [ ] **LINE OA verification**: pull follower counts through LINE's API
- [ ] **Custom domain**: move from `jaopor.vercel.app` to `jaopor.dev`
- [ ] **Founder on JaoPor's own listing**, to build in public
- [ ] **Security / key-handling page** reviewed and linked from the add-startup flow
- [ ] **Launch post** for Claude Thailand Community, in Thai

---

## 7. Milestones and KPIs

| Phase           | KPI                                       | Target    |
| --------------- | ----------------------------------------- | --------- |
| Launch, week 1  | Verified listings from the community      | 20        |
| Launch, month 1 | Real verified listings                    | 50        |
| Launch, month 3 | Real verified listings / monthly visitors | 100 / 10K |
| Phase 2         | First paying sponsor                      | 1         |
| Phase 2         | Monthly recurring revenue                 | ฿20,000+  |
| Phase 3         | First SME → builder match closed          | 1         |

---

## 8. Risks and mitigations

| Risk                                                | Mitigation                                                                                            |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Few Thai builders have Stripe revenue to verify     | Count visitors and commits as traction; add Opn, PromptPay and LINE OA verification                   |
| Concern about handing over API keys                 | Read-only keys only, a clear security page, aggregate data only                                       |
| Small market for paid boosts                        | Charge sponsors and SMEs, not builders                                                                |
| Thin buyer market for acquisitions                  | Keep the marketplace secondary; lead with matching                                                    |
| Dependence on one community                         | Expand to other Thai builder groups, universities and hackathons after launch                         |
| Ploykhong already owns launches for Claude builders | Position as "after launch": track growth over time; one-click import; badge that works on their pages |
| SaaSThai copies verification                        | Move fast on Thai payment rails and LINE OA verification, which are slow and costly to replicate      |
| Thai builder market is small                        | Keep costs near zero; sponsors over builders; expand to ASEAN once the playbook works                 |
