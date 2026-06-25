AWS Resource Explorer
A full-stack web app where you paste in an AWS Role ARN, and it shows you what's inside that AWS account like EC2 servers, S3 storage buckets, Lambda functions, IAM users/roles/policies, VPCs/subnets/security groups, and DynamoDB tables each on its own page.
This README walks through everything I did to build this, in the order I did it, including the mistakes I made along the way and what I learned from fixing them.

What You Need To Run This
Prerequisites:
Node.js installed
An AWS account with an IAM Role set up (with ReadOnlyAccess permissions) that your IAM user is allowed to assume via a trust policy
The Role's ARN (e.g. arn:aws:iam::123456789012:role/YourRoleName)
Setup:
Install backend dependencies and create a .env file inside /backend with your AWS access key, secret key, region, and port:
cd backend
npm install

AWS_ACCESS_KEY_ID=your_key_here
AWS_SECRET_ACCESS_KEY=your_secret_here
AWS_REGION=us-east-1
PORT=5050

Start the backend:
node index.js

In a separate terminal, install and start the frontend:
cd frontend
npm install
npm run dev

Open http://localhost:5173 in your browser, paste in your Role ARN, click "Assume Role," then browse the pages.

Why I Built It This Way
Before getting into the steps, here's the reasoning behind the major choices, since "why" matters as much as "what":
Why Vue.js + Node/Express? Vue and Node/Express work well together because they both use JavaScript, so I didn't have to learn a second language to build the frontend and backend. Vue lets you build an app as small, separate pieces, which is a great fit here since each AWS service (EC2, S3, Lambda, etc.) can be its own self-contained page that loads its own data. Express is a simple backend framework that doesn't get in your way it is useful here since most of the real complexity in this project comes from talking to AWS, not from building the web server itself.
Why does the backend "assume a role" instead of just using AWS keys directly? This was added (there's a specific /api/assume-role endpoint built in), but it's also genuinely the standard, secure way real companies handle AWS access. A permanent AWS key is like a house key if it's copied or leaked, it works forever until someone manually changes the locks. A role is more like a hotel keycard it's handed out temporarily, expires on its own, and can be revoked anytime. Instead of giving my app a permanent key, my code asks AWS for a temporary keycard every time it needs one.
Why a separate IAM User for the backend, instead of using my own admin login? My own login can do anything in my AWS account it can create resources, delete them, change billing, all of it. The backend's IAM user, by contrast, can do exactly one thing: ask to temporarily wear the Explorer role. This follows the security principle of least privilege and every part of a system should have the smallest amount of access it needs to do its job, nothing more. If this app's key were ever exposed, the damage is capped at "read-only AWS info," instead of "full control of the AWS account."
Why ReadOnlyAccess permissions on the role, instead of full access? This app only ever displays information it never creates or deletes AWS resources. Giving it only read permissions means even a mistake in my code can't accidentally break or delete real AWS infrastructure.
Why store credentials in backend memory instead of a database? For a small single-user demo app like this, it's the simplest approach that still demonstrates the real AWS authentication flow correctly.

Tech Stack
Frontend: Vue.js 3 (with Vue Router for multiple pages)
Backend: Node.js + Express
AWS Access: AWS SDK v3 (@aws-sdk/client-sts, @aws-sdk/client-ec2, @aws-sdk/client-s3, @aws-sdk/client-lambda, @aws-sdk/client-iam, @aws-sdk/client-dynamodb)
HTTP requests (frontend → backend): Axios

Architecture — How the Pieces Talk to Each Other
[ Browser ]
     |
     |  (you type a Role ARN, click pages)
     v
[ Vue.js Frontend ]  --- runs on http://localhost:5173
     |
     |  (Axios sends requests like GET /api/ec2/instances)
     v
[ Express Backend ]  --- runs on http://localhost:5050
     |
     |  (assumes the role via STS, then calls AWS services)
     v
[ AWS account ]  --- EC2 / S3 / Lambda / IAM / VPC / DynamoDB

Part 1 — Setting Up AWS
Step 1: Root login vs. IAM login
You should almost never use your AWS root login (the master account login) for daily work it can do literally anything, including delete the whole account. Instead, the right move is to log in once with root, create yourself a regular IAM user with admin permissions, and use that login from then on.
I did this:
Logged in once with root
Created an IAM user for myself (umer-admin) with AdministratorAccess
Saved the special IAM sign-in URL and used that login going forward
Step 2: Creating a separate IAM User for the backend app
I created a second, much more limited IAM user called aws-explorer-backend. This user has no console login (a human can't sign in as it) and no permissions of its own its only job is to be allowed to "ask" to wear the Explorer role.
Step 3: Creating the IAM Role
I created a role called AWSExplorerRole with the AWS-managed ReadOnlyAccess policy attached. This is the "badge" that actually has permission to read EC2/S3/Lambda/IAM/VPC/DynamoDB info.
Step 4: Connecting the User to the Role (the Trust Relationship)
This was the trickiest concept for me to understand: a Role's Trust Policy defines who is allowed to wear that badge. I had to edit the Role's trust policy (IAM → Roles → AWSExplorerRole → Trust Relationships) to explicitly allow my aws-explorer-backend user to assume it, AND give that user permission (via an inline policy) to call sts:AssumeRole on that specific role's ARN. Both halves needed to be correct and missing either one results in an "AccessDenied" error.

Part 2 — Building the Backend
Step 1: Project setup
mkdir aws-explorer-app
cd aws-explorer-app
mkdir backend
cd backend
npm init -y

This creates the package.json file — basically the "ID card" for a Node.js project, tracking the project's name and which packages (libraries) it depends on.
Step 2: Installing packages
npm install express cors dotenv @aws-sdk/client-sts @aws-sdk/client-ec2 @aws-sdk/client-s3 @aws-sdk/client-lambda @aws-sdk/client-iam @aws-sdk/client-dynamodb

What each one does:
express — the framework that lets the backend respond to web requests (the actual "server" part)
cors — lets the Vue frontend (a different port) talk to this backend without the browser blocking it for security reasons
dotenv — loads secret values (like AWS keys) from a .env file instead of hardcoding them in the code
@aws-sdk/* — official AWS packages, one per service, that let Node.js talk directly to AWS
Step 3: The .env file (secrets)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
PORT=5050

Why this file exists: it keeps secret AWS keys out of the actual code, so they're never accidentally shared or uploaded. These two keys are how the backend logs in as the aws-explorer-backend identity by themselves, they can't read any AWS data, they just get the backend in the door. Actually reading data requires the separate step of assuming the role.
Step 4: The .gitignore file
node_modules/
.env

Why this file exists: this tells Git (and GitHub) to never upload these two things. node_modules is huge and can always be regenerated with npm install, and .env contains secrets that should never be made public — leaking AWS keys publicly is a real security risk.
Step 5: Writing index.js — the actual server
This file sets up:
/api/health — a simple "are you alive?" test route
/api/assume-role — takes a Role ARN from the frontend, calls AWS STS (Security Token Service) to get temporary credentials, and stores them in memory
One route per AWS service (/api/ec2/instances, /api/s3/buckets, /api/lambda/functions, /api/iam/users, /api/vpc/list, /api/dynamodb/tables) — each one reuses the stored temporary credentials to ask AWS for real data, reshapes it down to just the fields needed, and sends it back to the frontend as JSON
Mistake I made (port conflict): When I first ran the server on port 5000, it silently got hijacked by macOS's built-in AirPlay Receiver feature, which also listens on port 5000. The server looked like it was running fine, but curl requests got rejected with a confusing 403 Forbidden from something called AirTunes. The fix was switching to port 5050 instead the code still has a fallback default of 5000 (PORT = process.env.PORT || 5000), but since .env provides 5050, that's what actually runs.
Step 6: Testing every endpoint with curl
Before touching the frontend at all, I tested every backend endpoint directly using curl. This let me confirm the AWS connection itself worked before adding the extra complexity of a UI if something broke, I'd know it was a frontend problem, not a backend/AWS problem.

Part 3 — Building the Frontend
Step 1: Creating the Vue project
cd aws-explorer-app
npm create vue@latest

I chose Vue Router (needed for multiple pages), no TypeScript, no Pinia, no testing tools, no ESLint/Prettier keeping things simple since I was brand new to Vue.
Step 2: Understanding the starter files, and what I deleted
Vue automatically generates example/demo files. Once I understood the pattern, I deleted the ones I didn't need: AboutView.vue, TheWelcome.vue, and HelloWorld.vue.
Mistake I made: deleting those files broke other files that still referenced them (App.vue and router/index.js still tried to import the deleted files). The fix was going into those two files and removing the leftover import lines. What I learned: in Vue, files are connected through imports and deleting a file isn't enough, you also have to update anything pointing to it.
Step 3: Building App.vue — the navigation bar
This file holds the permanent top navigation bar (Home / EC2 / S3 / Lambda / IAM / VPC / DynamoDB) using Vue Router's <RouterLink> for each clickable menu item, plus a <RouterView /> placeholder where the actual page content shows up depending on which link was clicked.
Step 4: Building HomeView.vue — the Role ARN entry page
A simple form: a text box for the Role ARN, a button that sends it to the backend's /api/assume-role using Axios, and a message that turns green on success or red on error.
Step 5: Building router/index.js — the page map
This file is the address book for the app each line says "if someone visits this URL, show this page," connecting a path like /ec2 to its matching component.
Step 6: Building the 6 resource pages
Each resource page (e.g. Ec2View.vue) follows the exact same pattern:
ref([]) creates a reactive variable that automatically updates the page when its value changes
onMounted runs a function automatically as soon as the page loads
That function uses Axios to call the matching backend endpoint
If data comes back, it's shown in a table; if there's an error, a red message shows instead; if the list is empty, a friendly "No X found" message shows

How the Frontend and Backend Are Connected
These two parts run as two completely separate programs on two separate ports frontend on 5173, backend on 5050. They're not linked by any shared file — the only connection is network requests, the same way a browser talks to any website.
The chain of events: clicking "Assume Role" → Axios sends a request to http://localhost:5050/api/assume-role carrying the typed-in ARN → Express receives it, does the AWS work, sends back a response → Axios receives that response in the Vue code and updates the screen accordingly. The CORS permission set up in the backend is what makes this cross-port connection allowed in the first place — without it, the browser would block it by default.

API Endpoints Reference
Method
Endpoint
What it returns
POST
/api/assume-role
Accepts a Role ARN, calls AWS STS, returns temporary credentials
GET
/api/ec2/instances
EC2 instances — ID, state, type, region
GET
/api/s3/buckets
S3 buckets — name, region, size, creation date
GET
/api/lambda/functions
Lambda functions — name, runtime, memory, last modified
GET
/api/iam/users
IAM users, roles, and attached policies
GET
/api/vpc/list
VPCs, subnets, and security groups
GET
/api/dynamodb/tables
DynamoDB tables — name, status, item count, region


What I Learned
AWS permissions made more sense once I had a mental picture for it. An IAM Role is like a temporary badge, and a Trust Policy is the list of who's allowed to wear that badge. Once I thought of it that way, the whole setup clicked.
Temporary keys are safer than permanent ones. If a temporary key leaks, it stops working on its own. A permanent key doesn't it's a risk forever until someone manually shuts it off.
"It's running" doesn't mean "it's working." My server said it was running on port 5000, but macOS was secretly blocking it the whole time. I learned to actually test the connection (curl -v), not just trust a green checkmark.
Vue.js, from zero. Before this project I'd never touched Vue components, ref, onMounted, and routing between pages were all brand new to me.
How a frontend and backend actually talk to each other. I'd learned this in theory before, but wiring up Axios to call a real API and show the response on screen made it click in a way reading about it never did.


Known Limitations / Things I'd Improve With More Time
Single-region only. The backend is configured for one AWS region at a time (set in .env). If a Role ARN points to resources in a different region, those pages will correctly connect but show empty results, since the backend is looking in the wrong region. A future improvement would be letting the user pick a region too, or having the backend check multiple regions automatically. (Note: IAM is a global service and isn't affected by this; S3's bucket listing is also global, only per-bucket region/size details need the region to line up.)
Credentials are stored in backend memory rather than per-user sessions — fine for a single-user demo, but wouldn't scale to multiple people using the app at once.
Error handling could be more specific instead of one generic message per route.

