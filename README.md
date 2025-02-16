# PentestGPT

PentestGPT provides advanced AI and integrated tools to help security teams conduct comprehensive penetration tests effortlessly. Scan, exploit, and analyze web applications, networks, and cloud environments with ease and precision, without needing expert skills.

## A Special Note of Thanks

Thank you so much, [@fkesheh](https://github.com/fkesheh) and [@Fx64b](https://github.com/Fx64b), for your amazing work and dedication to this project. 

Thank you for being part of the HackerAI family.

## Important Note About Running PentestGPT Locally

The primary purpose of this GitHub repo is to show what's behind PentestGPT in order to build trust.

You can run PentestGPT locally, but the RAG system, plugins, and more will only work with proper and complex configuration.

## Local Quickstart

Follow these steps to get your own PentestGPT instance running locally.

You can watch the full video tutorial [here](https://www.youtube.com/watch?v=9Qq3-7-HNgw).

### 1. Clone the Repo

```bash
git clone https://github.com/hackerai-tech/PentestGPT.git
```

### 2. Install Dependencies

Open a terminal in the root directory of your local PentestGPT repository and run:

```bash
npm install
```

### 3. Install Supabase & Run Locally

#### Why Supabase?

Previously, we used local browser storage to store data. However, this was not a good solution for a few reasons:

- Security issues
- Limited storage
- Limits multi-modal use cases

We now use Supabase because it's easy to use, it's open-source, it's Postgres, and it has a free tier for hosted instances.

We will support other providers in the future to give you more options.

#### 1. Install Docker

You will need to install Docker to run Supabase locally. You can download it [here](https://docs.docker.com/get-docker) for free.

#### 2. Install Supabase CLI

**MacOS/Linux**

```bash
brew install supabase/tap/supabase
```

**Windows**

```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

#### 3. Start Supabase

In your terminal at the root of your local PentestGPT repository, run:

```bash
supabase start
```

### 4. Fill in Secrets

#### 1. Environment Variables

In your terminal at the root of your local PentestGPT repository, run:

```bash
cp .env.local.example .env.local
```

Get the required values by running:

```bash
supabase status
```

Note: Use `API URL` from `supabase status` for `NEXT_PUBLIC_SUPABASE_URL`

Now go to your `.env.local` file and fill in the values.

If the environment variable is set, it will disable the input in the user settings.

#### 2. SQL Setup

In the 1st migration file `supabase/migrations/20240108234540_setup.sql` you will need to replace 2 values with the values you got above:

- `project_url` (line 53): `http://supabase_kong_pentestgpt:8000` (default) can remain unchanged if you don't change your `project_id` in the `config.toml` file
- `service_role_key` (line 54): You got this value from running `supabase status`

This prevents issues with storage files not being deleted properly.

### 5. Run app locally

In your terminal at the root of your local PentestGPT repository, run:

```bash
npm run chat
```

Your local instance of PentestGPT should now be running at [http://localhost:3000](http://localhost:3000). Be sure to use a compatible node version (i.e. v18).

You can view your backend GUI at [http://localhost:54323/project/default/editor](http://localhost:54323/project/default/editor).

### 6. Adding local user

#### 1. Sign Up

Go to the login screen at [http://localhost:3000](http://localhost:3000)

Fill in your email and password, then press Sign Up.

#### 2. Confirm email

Access Inbucket, the email testing service, at [http://localhost:54324](http://localhost:54324).

Find the mailbox for the email you used to sign up. Review the received message and confirm your email.

Now you can use this user and password to login.

## Hosted Quickstart

Follow these steps to get your own PentestGPT instance running in the cloud.

Video tutorial coming soon.

### 1. Follow Local Quickstart

Repeat steps 1-4 in "Local Quickstart" above.

You will want separate repositories for your local and hosted instances.

Create a new repository for your hosted instance of PentestGPT on GitHub and push your code to it.

### 2. Setup Backend with Supabase

#### 1. Create a new project

Go to [Supabase](https://supabase.com/) and create a new project.

#### 2. Get Project Values

Once you are in the project dashboard, click on the "Project Settings" icon tab on the far bottom left.

Here you will get the values for the following environment variables:

- `Project Ref`: Found in "General settings" as "Reference ID"

- `Project ID`: Found in the URL of your project dashboard (Ex: https://supabase.com/dashboard/project/<YOUR_PROJECT_ID>/settings/general)

While still in "Settings" click on the "API" text tab on the left.

Here you will get the values for the following environment variables:

- `Project URL`: Found in "API Settings" as "Project URL"

- `Anon key`: Found in "Project API keys" as "anon public"

- `Service role key`: Found in "Project API keys" as "service_role" (Reminder: Treat this like a password!)

#### 3. Configure Auth

Next, click on the "Authentication" icon tab on the far left.

In the text tabs, click on "Providers" and make sure "Email" is enabled.

We recommend turning off "Confirm email" for your own personal instance.

#### 4. Connect to Hosted DB

Open up your repository for your hosted instance of PentestGPT.

In the 1st migration file `supabase/migrations/20240108234540_setup.sql` you will need to replace 2 values with the values you got above:

- `project_url` (line 53): Use the `Project URL` value from above
- `service_role_key` (line 54): Use the `Service role key` value from above

Now, open a terminal in the root directory of your local PentestGPT repository. We will execute a few commands here.

Login to Supabase by running:

```bash
supabase login
```

Next, link your project by running the following command with the "Project ID" you got above:

```bash
supabase link --project-ref <project-id>
```

Your project should now be linked.

Finally, push your database to Supabase by running:

```bash
supabase db push
```

Your hosted database should now be set up!

### 3. Setup Frontend with Vercel

Go to [Vercel](https://vercel.com/) and create a new project.

In the setup page, import your GitHub repository for your hosted instance of PentestGPT. Within the project Settings, in the "Build & Development Settings" section, switch Framework Preset to "Next.js".

In environment variables, add the following from the values you got above:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

You can also add API keys as environment variables.

- `MISTRAL_API_KEY`
- `OPENAI_API_KEY`

For the full list of environment variables, refer to the '.env.local.example' file. If the environment variables are set for API keys, it will disable the input in the user settings.

Click "Deploy" and wait for your frontend to deploy.

Once deployed, you should be able to use your hosted instance of PentestGPT via the URL Vercel gives you.

## Updating

In your terminal at the root of your local PentestGPT repository, run:

```bash
npm run update
```

If you run a hosted instance you'll also need to run:

```bash
npm run db-push
```

to apply the latest migrations to your live database.

## Have a feature request, question, or comment?

You can get in touch with us through the HackerAI Help Center at [https://help.hackerai.co](https://help.hackerai.co).

## Contributing

Interested in contributing to PentestGPT? Please see [CONTRIBUTING.md](https://github.com/hackerai-tech/PentestGPT/blob/main/CONTRIBUTING.md) for setup instructions and guidelines for new contributors. As an added incentive, top contributors will have the opportunity to become part of the PentestGPT team.

## License

Licensed under the [GNU General Public License v3.0](https://github.com/hackerai-tech/PentestGPT/blob/main/license)
