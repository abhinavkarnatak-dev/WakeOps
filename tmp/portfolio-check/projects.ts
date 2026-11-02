import type { Project } from "./types";

/**
 * Ordered list - first item renders first in the grid.
 * To add a project, copy the shape of an existing entry and it will get a
 * card, a case-study page, an OG image and a sitemap entry automatically.
 * `hardProblems` may be left empty - the section only renders when filled.
 */
export const projects: Project[] = [
  {
    slug: "nimbus",
    name: "Nimbus",
    oneLiner:
      "An autonomous cloud coding agent that can understand a GitHub repo, answer questions about it, write code and ship changes as pull requests.",
    description:
      "A full-stack AI coding agent built with React, Node.js and LangGraph, with repository-aware reasoning, isolated E2B execution and secure GitHub integration.",
    status: "shipped",
    tags: ["LangGraph", "E2B", "GitHub", "React", "Node.js", "MongoDB"],
    links: [
      { label: "Live", href: "https://nimbus.abhinavkarnatak.com/" },
      {
        label: "GitHub",
        href: "https://github.com/abhinavkarnatak-dev/Nimbus",
      },
    ],
    caseStudy: {
      problem: [
        "An agent that writes code is a demo. An agent that writes code in your repository is a security problem wearing a demo's clothes. The moment it can run commands and push branches, the interesting question stops being 'can the model do it' and becomes 'what happens when the model is wrong, or when a file in the repo tells it to do something its owner never asked for'.",
        "I wanted to build the version that takes that question seriously: the model proposes, deterministic code decides, and the machine running untrusted commands holds nothing worth stealing. Everything else in Nimbus follows from that one rule.",
      ],
      built: [
        "Nimbus takes one public repository and one task, opens an isolated E2B sandbox, and runs a LangGraph agent loop inside it with a fixed toolset - list, search, read, patch, create, run commands, run checks, package a commit. Ask how something works and it reads the files and answers without changing anything; ask for a change and it writes one, runs your tests and linter, and opens a pull request. Both happen in the same conversation, which outlives any single run.",
        "The model is the user's own Gemini key, encrypted per account, so nothing is billed to the deployment. Sessions stream live over WebSockets: every step, every command, every changed file with a red/green diff, every check result, and the pull request when it lands.",
      ],
      architecture: {
        description: [
          "The system is drawn around one question: where can a credential exist? The sandbox is treated as hostile, because it runs model-proposed commands against code written by strangers. It receives no GitHub token, no database URI, no model key, no session secret. It can only ever hand back a patch.",
          "The trusted backend does the rest. It validates that patch - base commit, paths, protected files, size, secret scanning - then mints a GitHub token narrowed to one repository and the minimum permissions, pushes to a branch it created, opens the pull request, and throws the token away. A deterministic policy gate runs before every effect and pauses for human approval on anything destructive. MongoDB holds sessions and durable state, Redis holds sessions, locks and rate limits, and no string produced by a model or a repository ever reaches the code that authorizes an action.",
        ],
      },
      hardProblems: [
        {
          title: "A passing test that locked in the bug",
          body: [
            "Pull request emails arrived for some pull requests and not others, with no pattern I could see. The notification lived inside the pull request gateway and was reached on exactly one path - the one where the gateway had just created the pull request itself. Two early returns skipped it silently: finding a pull request already open on the branch, and losing a creation race then fetching the winner. Branch names are derived from the session id, so they are stable, which meant any session that ran a second time took the first of those paths and said nothing.",
            "The part worth remembering is that a test named 'notifies once, not once per attempt' passed the entire time. It was asserting the behaviour of the fake gateway rather than the behaviour anybody wanted. I moved notification out to the session runner, which is the only place that knows what the session already had, and keyed it on a pull request number the session was not already carrying. A green suite is evidence that the code does what the tests say, not that the tests say the right thing.",
          ],
        },
        {
          title: "Mail that worked everywhere except production",
          body: [
            "Sign-in codes sent fine from my machine and failed on the deployment, every time, after a 10.7 second wait. My first guess was that the host blocked outbound SMTP. That guess did not survive being reminded that production had sent mail before. The log said ESOCKET on CONN with 'connect ENETUNREACH' against an IPv6 address, so I forced the transport to IPv4 - and nothing changed. The next failure named a different IPv6 address, which was the actual clue: something was choosing, and choosing differently each time.",
            "It was in the mail library. It resolves the hostname itself, concatenates the A and AAAA records, and then takes addresses[Math.floor(Math.random() * addresses.length)] before handing a literal to the socket - by which point an IPv4 preference is meaningless, because there is no name left to resolve. On a host with no IPv6 route, every AAAA record in that list is a coin flip that fails. Resolving to IPv4 myself fixed the flip, but not the shape of the problem, so mail moved onto an HTTPS API instead. Reading the library's source took ten minutes and replaced three confident wrong theories.",
          ],
        },
        {
          title: "Attachments that could not be deleted",
          body: [
            "Five images filled the per-account limit. Removing all five appeared to empty it, and the next upload was still refused. The browser and the database disagreed about what existed, which is a bad thing for a database to be uncertain about.",
            "The uploads were being started from inside a React state updater. React invokes those twice in StrictMode precisely to expose updaters that are not pure, and each invocation minted fresh local ids and fired its own upload - so one chosen file became two rows, and only one of them carried an id the browser could ever use to delete it. The other was an orphan that counted against the limit until a sweeper found it a day later. Moving the uploads and deletes out of the updater fixed it, and the lesson generalises: a state updater is a pure function of the previous state, and anything with a side effect does not belong in one.",
          ],
        },
        {
          title: "A cookie that ignored the server's clock",
          body: [
            "People were being signed out mid-sentence, roughly an hour after signing in, no matter how active they had been. The server side looked correct - every request pushed the stored session another hour into the future, so as far as Redis was concerned an active person stayed active.",
            "The browser was never told. The cookie was written once, at sign in, with a one hour life, and nothing ever rewrote it, so the two clocks disagreed and the shorter one always won. There was also a hard ceiling calculated by multiplying the idle window by twenty four, which meant neither number could be moved without moving the other. The cookie is now rewritten on every request that carries a working session, from the same number the server just used, the idle window and the ceiling are separate settings, and a refreshed cookie is never given more time than the session actually has left.",
          ],
        },
        {
          title: "Two hosts that could not share a session",
          body: [
            "With the API on one platform and the browser app on another, signing in worked and every request after it was anonymous. The cookie was being set and then never sent again.",
            "Session cookies are SameSite=Lax, and browsers decide 'same site' by registrable domain rather than by host - so a frontend on one vendor's domain calling an API on another's is cross-site, and Lax means the cookie stays home. No CORS header fixes that, and SameSite=None would have given up the exact protection the cookie exists to provide. The answer was to stop fighting it and put both halves under one domain I own, as sibling subdomains. Some problems are configuration; this one was a property of the web, and the only correct move was to arrange the deployment around it.",
          ],
        },
      ],
      results: [
        "The sandbox holds no credential of any kind - it can only hand back a patch, which the trusted backend validates before that patch is allowed to become a branch.",
        "Nimbus cannot merge, approve, close, force-push, or write to a default branch. Pushing to the default branch is refused in code, not by convention.",
        "Answering a question and making a change are the same conversation: a session can end with an answer and no diff, or with a reviewed pull request, and follow-ups continue where it left off.",
        "Backed by over 3,400 unit tests plus integration tests against real MongoDB and Redis, and running in production on managed Mongo, Redis, object storage and sandboxes.",
      ],
      stack: [
        {
          group: "Frontend",
          items: ["React", "TypeScript", "Vite", "WebSockets"],
        },
        {
          group: "Agent",
          items: ["LangGraph", "Gemini", "Code retrieval", "Policy gate"],
        },
        {
          group: "Backend & Data",
          items: ["Node.js", "Express", "MongoDB", "Redis"],
        },
        {
          group: "Execution & Integrations",
          items: ["E2B", "GitHub App", "Cloudflare R2"],
        },
      ],
    },
  },
  {
    slug: "wakeops",
    name: "WakeOps",
    oneLiner:
      "Incident response platform that turns Grafana alerts into durable call, email and Slack escalation workflows.",
    description:
      "A full-stack incident response platform built with Next.js, Express, PostgreSQL and Temporal, with Grafana webhooks, Twilio calls and queued notifications.",
    status: "shipped",
    tags: ["Next.js", "Temporal", "PostgreSQL", "Twilio", "RabbitMQ"],
    links: [
      { label: "Live", href: "https://wakeops.abhinavkarnatak.com/" },
      {
        label: "GitHub",
        href: "https://github.com/abhinavkarnatak-dev/WakeOps",
      },
    ],
    caseStudy: {
      problem: [
        "An alert is not an incident response. Grafana can say that a service is failing, but it does not know which engineer owns that service, whether they answered the call, when to try again, or when to escalate. Handling those steps by hand works until the alert arrives at the wrong hour and every missed minute matters.",
        "I wanted WakeOps to own that gap: accept one alert, map it to the right people and infrastructure, keep the response running outside the original HTTP request, and leave behind one clear incident record instead of a trail spread across provider dashboards.",
      ],
      built: [
        "WakeOps gives each organization a secured Grafana webhook and a setup flow for hosts, services, environments, and on-call and senior engineers. A firing alert is verified, normalized, mapped to the saved deployment, fingerprinted to stop duplicate active incidents, and persisted before the API returns. The dashboard then shows the incident, its status, call attempts, and audit timeline as they change.",
        "Each new incident starts a Temporal workflow. The worker calls the on-call engineer through Twilio, waits for the result, retries unanswered calls, and escalates to the senior engineer when both on-call attempts fail. Email and Slack jobs go through RabbitMQ, so a slow notification provider cannot hold up the call path, and Twilio callbacks update PostgreSQL and signal the running workflow when somebody acknowledges.",
      ],
      architecture: {
        description: [
          "The Next.js app handles Google sign-in, organization setup, integrations, and incident views. The Express API handles short-lived work: Grafana webhooks, Twilio voice and status callbacks, health checks, and signals sent to Temporal. PostgreSQL is the application source of truth for mappings, incidents, attempts, and audit events; Temporal owns timers, retries, and long-running workflow state.",
          "The worker is deliberately separate from the API. It polls Temporal, runs call activities, publishes RabbitMQ jobs, and consumes the email and Slack queues without needing a public URL. The web app runs on Vercel, the API on Render, and managed Supabase, Temporal Cloud, and CloudAMQP provide the shared state and messaging that let the pieces communicate.",
        ],
      },
      hardProblems: [
        {
          title:
            "A healthy deployment that could not open one more database connection",
          body: [
            "Google sign-in started looping back to the login page while the API health check stayed green. The Vercel logs finally showed the real failure: Supabase's session pool had reached its fifteen-client limit. Every serverless instance could create a Prisma client, and reusing one client inside a warm process could not stop multiple processes from holding sessions.",
            "The web deployment moved to Supabase's transaction pooler with a one-connection Prisma limit, while the Prisma client is cached globally inside each warm runtime. That matches the connection model to serverless execution: short requests borrow a pooled connection instead of every function instance trying to own a database session.",
          ],
        },
        {
          title: "New worker source running an old workflow",
          body: [
            "A Temporal activity failed because attemptNumber was missing, even though the TypeScript source clearly passed it. The worker imported the workflows package through its compiled dist output, and that output was older than the source. Restarting the worker kept loading the stale bundle, so the failure looked like a data problem instead of a build problem.",
            "The worker's development command now builds the workflows package before it starts. I also treated already-running workflows separately: Temporal preserves their event history, so changing source code cannot rewrite arguments already recorded for an old execution. Stale executions are terminated and new incidents start against the fresh bundle.",
          ],
        },
        {
          title: "One free process trying to be both API and worker",
          body: [
            "Running the Express API and Temporal worker in one Render service looked convenient, but the service became inconsistent under a small memory and CPU budget. The worker bundles workflow code, holds long-lived Temporal and RabbitMQ connections, and runs consumers, while the API needs predictable resources for webhooks, callbacks, and health checks. A failure in either process also brought down the other.",
            "I separated the API from the worker again. Render now serves only HTTP traffic, while the worker runs independently and connects outbound to Temporal Cloud, Supabase, CloudAMQP, and Twilio. There is no worker URL because nothing calls into it; it polls for work and can reconnect without changing any webhook configuration.",
          ],
        },
        {
          title: "A live counter that froze at 09",
          body: [
            "The overview counters animated correctly on page load but failed during polling. When call attempts moved from 9 to 10, the UI displayed 09 and stayed there; other increases and decreases appeared unchanged until a manual reload. The polling data was fresh. The animation effect updated the same state listed in its dependency array, so its cleanup ran immediately and cancelled the frame that would have completed the transition.",
            "I replaced the per-digit reset with a stable previous-value-to-next-value transition driven only by the server value. The old and new numbers are separate layers, increases and decreases move in opposite directions, and an internal state update can no longer cancel its own animation. That also removed the temporary leading zero at digit boundaries.",
          ],
        },
      ],
      results: [
        "A mapped Grafana alert becomes one deduplicated incident with an assigned on-call engineer, durable retries, senior escalation, and a complete call and audit history.",
        "The webhook returns after validation and persistence; calls, timers, retries, and notifications continue independently through Temporal and RabbitMQ.",
        "Email, Slack, and voice are separate delivery paths, so one provider failing or slowing down does not block the others.",
        "The web app and API run behind permanent custom domains, while the worker connects outbound and can move to any always-on host without changing public callbacks.",
      ],
      stack: [
        {
          group: "Frontend",
          items: ["Next.js", "TypeScript", "Tailwind CSS", "Auth.js"],
        },
        {
          group: "Backend & Data",
          items: ["Node.js", "Express", "PostgreSQL", "Prisma"],
        },
        { group: "Workflow & Messaging", items: ["Temporal", "RabbitMQ"] },
        {
          group: "Integrations",
          items: ["Grafana", "Twilio", "Slack", "Resend"],
        },
        {
          group: "Infrastructure",
          items: ["Vercel", "Render", "Supabase", "CloudAMQP"],
        },
      ],
    },
  },
  {
    slug: "yapit",
    name: "YapIt",
    oneLiner:
      "Microservices chat platform that survives real production failures - brokers, caches, sockets and all.",
    description:
      "A full-stack microservices chat app: Next.js, Express, MongoDB, Socket.io, RabbitMQ and Redis, containerized and deployed on AWS EC2 with CI/CD.",
    status: "shipped",
    tags: ["Next.js", "Socket.io", "RabbitMQ", "Redis", "Docker", "AWS"],
    links: [
      { label: "Live", href: "https://yapit.abhinavkarnatak.com/" },
      { label: "GitHub", href: "https://github.com/abhinavkarnatak-dev/YapIt" },
    ],
    caseStudy: {
      problem: [
        "Real-time chat is trivial to demo and genuinely hard to run. A single Express server with Socket.io works until the first deploy drops every connection, the first traffic spike floods the database, or the first background job (say, sending an OTP email) blocks a request thread.",
        "I wanted a chat application built the way a small production team would build it: independent services, an async message broker, a cache layer, a reverse proxy, and a pipeline that ships to a real server on every push - so that every failure mode I read about, I would eventually hit myself.",
      ],
      built: [
        "YapIt is split into focused Express services - user, chat, and mail - behind an Nginx reverse proxy, with a Next.js frontend. Real-time messaging runs over Socket.io; cross-service work (like OTP emails on signup and global account-data cleanup) goes through RabbitMQ instead of blocking HTTP calls; Redis caches hot reads such as user profiles and chat lists. File sharing is backed by AWS S3.",
        "Everything is containerized with Docker Compose and deployed to an AWS EC2 instance. A GitHub Actions pipeline builds and redeploys the services on every push to main.",
      ],
      architecture: {
        description: [
          "The frontend talks to Nginx, which routes by path to the user, chat and mail services. The chat service holds Socket.io connections and persists messages to MongoDB. Signup flows publish OTP jobs to RabbitMQ; the mail service consumes the queue and sends email, so a slow SMTP call never delays an API response. Redis sits beside the chat and user services as a read-through cache with explicit invalidation on writes, and uploads go straight to S3.",
        ],
        // diagram: { src: "/diagrams/yapit-architecture.png", alt: "YapIt architecture diagram", width: 1400, height: 900 },
      },
      hardProblems: [
        {
          title: "Redis connections dying silently in production",
          body: [
            "After hours of uptime, services started throwing SocketClosedUnexpectedlyError and crashing on the next cache read. Locally it never reproduced - the connection only gets reaped after long idle periods, which dev sessions never reach.",
            "The fix had two parts: attach a real error handler to the Redis client (an unhandled 'error' event kills the Node process), and configure a reconnect strategy with backoff plus periodic pings so idle connections either stay alive or heal themselves. The deeper lesson: a cache client is a long-lived network dependency, not a constructor you call once and forget.",
          ],
        },
        {
          title: "RabbitMQ race conditions on cold starts",
          body: [
            "On fresh deploys, services raced the broker: consumers tried to connect and assert queues before RabbitMQ finished booting, so containers crash-looped or - worse - came up 'healthy' without ever attaching a consumer, and OTP emails silently queued forever.",
            "depends_on ordering isn't readiness. I added connection retry loops with backoff in every service, made queue assertion idempotent on both producer and consumer sides, and treated 'broker unavailable' as a normal startup state instead of a fatal error.",
          ],
        },
        {
          title: "CI/CD deploys failing on git pull conflicts",
          body: [
            "The deploy job SSH'd into EC2 and ran git pull - which worked until a hotfix edited a file directly on the server. From then on every deploy failed with merge conflicts, meaning the pipeline silently stopped shipping.",
            "I stopped treating the server as a checkout anyone may touch: the pipeline now does git fetch + git reset --hard origin/main, and the box is treated as a disposable deploy target. If it needs a fix, the fix goes through the repo.",
          ],
        },
        {
          title: "EC2 disk slowly filling until deploys died",
          body: [
            "Weeks in, deploys started failing with 'no space left on device'. Every image rebuild left the previous build's layers behind as dangling images, and on a small EC2 volume that adds up fast.",
            "Short-term fix: docker system prune in the deploy script. Long-term fix: multi-stage builds so runtime images stopped carrying build toolchains, which cut image size and made the pruning matter less in the first place.",
          ],
        },
        {
          title: "Nginx 502s that were really port-mapping bugs",
          body: [
            "Intermittent 502 Bad Gateway errors from Nginx pointed at 'the backend being down' - but the services were running. The actual cause: upstream definitions pointing at ports that a compose refactor had stopped publishing, so Nginx was proxying into a void.",
            "I made every service's internal port explicit in compose, matched upstreams to the compose service names on the shared network instead of host ports, and added a smoke check to the deploy so a bad mapping fails the pipeline instead of paging me with 502s.",
          ],
        },
      ],
      results: [
        "Deploys are hands-off: push to main, and the pipeline rebuilds and restarts the affected services on EC2.",
        "OTP and email delivery is fully decoupled from request latency via RabbitMQ - an SMTP outage delays mail, not signups.",
        "Services restart cleanly in any order: broker and cache reconnection is handled everywhere, so a single container restart no longer cascades.",
        "The failure modes above are fixed at the pipeline level (reset-based deploys, pruning, smoke checks), not patched by hand on the box.",
      ],
      stack: [
        { group: "Frontend", items: ["Next.js", "TypeScript", "Tailwind CSS"] },
        { group: "Services", items: ["Node.js", "Express", "Socket.io"] },
        { group: "Data & messaging", items: ["MongoDB", "Redis", "RabbitMQ"] },
        {
          group: "Infra",
          items: ["Docker", "Nginx", "AWS (EC2, S3)", "GitHub Actions"],
        },
      ],
    },
  },
  {
    slug: "revuea",
    name: "Revuea",
    oneLiner:
      "Anonymous feedback platform with OTP-gated signups, AI summaries and a live analytics dashboard.",
    description:
      "A full-stack anonymous feedback platform: React, Node.js and PostgreSQL via Prisma, with OTP auth, Gemini-powered summaries, Recharts analytics and CSV export.",
    status: "shipped",
    tags: ["React", "Node.js", "PostgreSQL", "Prisma", "Gemini API"],
    links: [
      { label: "Live", href: "https://revuea.abhinavkarnatak.com/" },
      {
        label: "GitHub",
        href: "https://github.com/abhinavkarnatak-dev/Revuea",
      },
    ],
    caseStudy: {
      problem: [
        "Honest feedback needs anonymity - people soften what they say when their name is attached. But fully anonymous input creates two new problems: spam accounts, and a wall of unstructured text nobody actually reads.",
        "Revuea tackles both: verified-but-anonymous submissions, and AI that turns feedback volume into something a human can act on.",
      ],
      built: [
        "A full-stack web app where users collect anonymous feedback behind a secure OTP-based signup flow - accounts are verified, submissions stay anonymous. Feedback lands in a dashboard built with Recharts for visualizing trends at a glance.",
        "The Gemini API condenses large volumes of raw feedback into readable text summaries on demand, and a CSV export covers anyone who wants to run their own analysis outside the app.",
      ],
      architecture: {
        description: [
          "React frontend talking to a Node.js/Express API, with PostgreSQL behind Prisma ORM for typed, migration-managed data access. OTP verification gates account creation; the summarization endpoint batches stored feedback and streams it through the Gemini API before returning a digest to the dashboard.",
        ],
      },
      hardProblems: [],
      results: [
        "Feedback is anonymous to readers but spam-resistant - OTP verification keeps accounts real without deanonymizing submissions.",
        "Gemini summaries turn large feedback volumes into readable digests instead of an unread backlog.",
        "Recharts dashboard and CSV export cover both quick scanning and deeper external analysis.",
      ],
      stack: [
        { group: "Frontend", items: ["React", "Tailwind CSS", "Recharts"] },
        { group: "Backend", items: ["Node.js", "Express", "Prisma"] },
        { group: "Data & AI", items: ["PostgreSQL", "Gemini API"] },
      ],
    },
  },
  {
    slug: "pixscribe",
    name: "PixScribe",
    oneLiner:
      "SaaS text-to-image generator with a metered credit system and Razorpay payments wired end to end.",
    description:
      "A full-stack SaaS text-to-image web app: React, Node.js, Express and MongoDB, with a credit system, Razorpay payment integration and a Framer Motion UI.",
    status: "shipped",
    tags: ["React", "Node.js", "MongoDB", "Razorpay", "Tailwind CSS"],
    links: [
      { label: "Live", href: "https://pixscribe.abhinavkarnatak.com/" },
      {
        label: "GitHub",
        href: "https://github.com/abhinavkarnatak-dev/PixScribe",
      },
    ],
    caseStudy: {
      problem: [
        "AI image generation has a real per-request cost, so a usable product needs more than a prompt box - it needs metering, payments, and account state that stays correct even when a payment flow is interrupted halfway.",
        "PixScribe is the full SaaS loop: generate, run out of credits, pay, keep generating.",
      ],
      built: [
        "A full-stack web app where users generate AI images from text prompts, with every generation debited against a per-account credit balance stored in MongoDB.",
        "A Razorpay integration handles payment processing for credit top-ups, verifying successful transactions server-side before balances update - so credits only appear when money actually moved. The UI is built with Tailwind CSS and Framer Motion for smooth layout and state transitions.",
      ],
      architecture: {
        description: [
          "React frontend against a Node.js/Express API with MongoDB for users, balances and generation history. The payment flow goes client → Razorpay checkout → server-side verification of the transaction signature → atomic credit update, keeping the balance authoritative on the server rather than trusting the client.",
        ],
      },
      hardProblems: [],
      results: [
        "Credits meter real generation cost per account, with balances updated automatically on verified payments.",
        "Payment verification is server-side - client-reported success alone never credits an account.",
        "Fast, responsive UI with animated state transitions across the generate → pay → generate loop.",
      ],
      stack: [
        {
          group: "Frontend",
          items: ["React", "Tailwind CSS", "Framer Motion"],
        },
        { group: "Backend", items: ["Node.js", "Express", "MongoDB"] },
        { group: "Payments", items: ["Razorpay"] },
      ],
    },
  },
  {
    slug: "dermaglow-ai",
    name: "DermaGlow AI",
    oneLiner:
      "AI skincare advisor that turns a short skin questionnaire into a personalized routine and product picks.",
    description:
      "An AI-powered skincare platform built with Next.js and TypeScript: describe your skin type, concerns and goals, and get a tailored routine with product recommendations.",
    status: "shipped",
    tags: ["Next.js", "TypeScript", "AI API", "Tailwind CSS"],
    links: [
      { label: "Live", href: "https://dermaglow.abhinavkarnatak.com/" },
      {
        label: "GitHub",
        href: "https://github.com/abhinavkarnatak-dev/DermaGlow-AI",
      },
    ],
    caseStudy: {
      problem: [
        "Skincare advice online is either generic listicles or product marketing - neither accounts for the one thing that matters: your actual skin. Real personalization needs to reason over skin type, concerns and goals together, which is exactly the kind of unstructured-input problem AI models are good at.",
      ],
      built: [
        "DermaGlow AI runs a three-step flow: users fill out a short form describing their skin type, concerns and objectives; an AI model processes that into an individual skin profile; and the app returns a tailored skincare routine alongside concrete product suggestions.",
        "The whole app is built with Next.js and TypeScript, with a clean Tailwind CSS interface that keeps the form-to-routine journey friction-free.",
      ],
      architecture: {
        description: [
          "A Next.js App Router application: the questionnaire submits to a server-side route that prompts an AI API with the structured profile and shapes the response into routine steps and product recommendations the UI can render consistently.",
        ],
      },
      hardProblems: [],
      results: [
        "A short form is all it takes - the AI handles the reasoning from profile to routine.",
        "Recommendations come back structured (routine steps + products), not as a wall of generated text.",
        "End-to-end TypeScript keeps the AI response shape honest between server and UI.",
      ],
      stack: [
        { group: "App", items: ["Next.js", "TypeScript", "Tailwind CSS"] },
        { group: "AI", items: ["AI API integration"] },
      ],
    },
  },
  {
    slug: "adaptsense",
    name: "AdaptSense",
    oneLiner:
      "Cross-platform accessibility app translating between 13 media and language combinations with AI.",
    description:
      "A React Native (Expo) accessibility app for visually and hearing-impaired users: a media pipeline routing audio, image, text and braille inputs to visual or auditory outputs via Gemini.",
    status: "shipped",
    tags: ["React Native", "Expo", "Gemini API", "Accessibility"],
    links: [
      {
        label: "GitHub",
        href: "https://github.com/abhinavkarnatak-dev/AdaptSense",
      },
    ],
    caseStudy: {
      problem: [
        "Accessibility tools tend to solve one translation in one direction - speech-to-text, or text-to-speech, and that's it. Visually and hearing-impaired users live across many combinations of input and output, and switching apps for each one is friction they shouldn't have to carry.",
        "AdaptSense treats modality translation as one pipeline instead of a dozen features.",
      ],
      built: [
        "A cross-platform mobile app built with React Native and Expo, designed around daily accessibility for visually and hearing-impaired users.",
        "At its core is a flexible media processing pipeline: it accepts audio, image, text or braille input and dynamically routes it to the right visual or auditory output - including sign-language GIFs. Gemini APIs in the backend handle the translation work across 13 distinct language and media combinations.",
      ],
      architecture: {
        description: [
          "The Expo app captures or receives media and hands it to a backend pipeline that classifies the input type, selects the target output modality, and dispatches to the appropriate Gemini-powered translation path. Output rendering is modality-aware on the client - audio playback, visual display, or GIF-based sign language.",
        ],
      },
      hardProblems: [],
      results: [
        "One pipeline handles 13 unique language and media combinations with high accuracy.",
        "Runs cross-platform from a single React Native codebase via Expo.",
        "Input-agnostic by design: audio, image, text and braille all enter the same routing pipeline.",
      ],
      stack: [
        { group: "App", items: ["React Native", "Expo", "TypeScript"] },
        { group: "AI", items: ["Gemini API"] },
      ],
    },
  },
  {
    slug: "aviageek",
    name: "AviaGeek",
    oneLiner:
      "An aircraft model guide for aviation geeks - explore aircraft, model by model.",
    description:
      "A Next.js web app for exploring aircraft models: an aviation reference guide with a clean, browsable interface for plane spotters and enthusiasts.",
    status: "shipped",
    tags: ["Next.js", "React", "Tailwind CSS"],
    links: [
      { label: "Live", href: "https://aviageek.abhinavkarnatak.com/" },
      {
        label: "GitHub",
        href: "https://github.com/abhinavkarnatak-dev/AviaGeek",
      },
    ],
    caseStudy: {
      problem: [
        "Aircraft information lives scattered across wikis, forums and manufacturer PDFs. For an aviation enthusiast who just wants to identify and compare aircraft models, there's no clean, single place to browse them.",
      ],
      built: [
        "AviaGeek is exactly that place: an aircraft model guide where users can explore aircraft with their details in one consistent, browsable interface - built as a fast Next.js app with a Tailwind CSS design.",
      ],
      architecture: {
        description: [
          "A Next.js App Router application with a structured aircraft data model behind it, so every aircraft renders through the same detail layout and new models are added as data, not new pages.",
        ],
      },
      hardProblems: [],
      results: [
        "One consistent reference layout across every aircraft model.",
        "Adding an aircraft is a data change, not a UI change.",
      ],
      stack: [{ group: "App", items: ["Next.js", "React", "Tailwind CSS"] }],
    },
  },
  {
    slug: "sudowiz",
    name: "SudoWiz",
    oneLiner:
      "Interactive Sudoku solver - type in any puzzle and a backtracking algorithm cracks it.",
    description:
      "A web-based Sudoku solver built with React, Vite and Tailwind CSS: an interactive grid with input validation and a backtracking algorithm that solves any valid puzzle.",
    status: "shipped",
    tags: ["React", "Vite", "Algorithms", "Tailwind CSS"],
    links: [
      { label: "Live", href: "https://sudowiz.abhinavkarnatak.com/" },
      {
        label: "GitHub",
        href: "https://github.com/abhinavkarnatak-dev/SudoWiz",
      },
    ],
    caseStudy: {
      problem: [
        "Backtracking is one of those algorithms everyone learns and few ever see working. A Sudoku solver makes it tangible: enter a real puzzle you're stuck on and watch constraint-based search finish it.",
      ],
      built: [
        "SudoWiz is an interactive 9x9 grid: type in any puzzle (with validation so illegal boards are caught as you enter them), hit solve, and the backtracking solver fills the board, highlighting the cells it computed. A reset clears the grid for the next puzzle, and the layout works on desktop and mobile.",
      ],
      architecture: {
        description: [
          "A React single-page app built with Vite. The solver is a recursive backtracking algorithm enforcing row, column and box constraints, kept separate from the UI so the grid just renders board state.",
        ],
      },
      hardProblems: [],
      results: [
        "Solves any valid puzzle instantly, with solved cells highlighted against the user's input.",
        "Input validation rejects illegal boards before the solver ever runs.",
        "Fully responsive - usable as a quick solver on a phone.",
      ],
      stack: [{ group: "App", items: ["React", "Vite", "Tailwind CSS"] }],
    },
  },
];

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
