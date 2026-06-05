<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
<!-- BEGIN:nextjs-agent-rules -->
## Project Overview
Scarlet is a full-stack application that allows users to track their personal plant collection, see our Catalog of pants with instructions on how to grow them, analyze plant health via AI, and shop for flowers.

# Technologies
Next.js + Neon DB + Drizzle ORM + React + Tailwind

# Architectural Guidelines
Service layer: implement app business logic, used by the RESTful API and Server Actions
Use modular design: split the app into selft-contained components, to avoid complex files with too much code
Auth: JWT tokens + bcrypt
Database: Neon DB + Drizzle ORM
 # User Interface Guidelines
Implement modern UI, responsive design, use server-rendered components in Next.js
Use server-side rendering, only use client components for browser interaction and forms



