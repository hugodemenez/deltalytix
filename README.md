# Deltalytix

Deltalytix is an advanced analytics platform for modern traders, providing comprehensive tools to store, explore, and understand trading track records.

## Features

### 1. User Authentication
- Secure authentication system using Supabase
- Support for Discord login
- User profile management

### 2. Data Import and Processing
- CSV data import functionality
- AI-assisted field mapping for efficient data processing
- Support for multiple CSV formats, including Rithmic Performance Import
- Data encryption for enhanced security

### 3. Advanced Analytics
- Daily performance chart with customizable views (PnL, Volume, etc.)
- Trading session summaries
- Decile statistics and trading habits analysis (upcoming)
- AI-powered sentiment analysis (upcoming)

### 4. User Interface
- Responsive design for both desktop and mobile
- Dark mode support
- Customizable dashboard
- Interactive charts and data visualizations

### 5. Developer-Friendly
- Open-source project
- Comprehensive documentation (upcoming)
- Active developer community

### 6. Pricing Tiers
- Multiple pricing plans to suit different trader needs
- Features include:
  - Account limits
  - Data storage duration
  - Mentor Mode

### 7. Data Management
- Secure storage of trading data
- Easy access to historical trading information
- Data visualization tools

## Getting Started

To run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Technologies Used

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase
- Prisma

## Technical Architecture

### Data Fetching and Caching
- API routes with GET methods are used extensively to leverage Next.js/Vercel's built-in caching capabilities
- Server Actions are employed for mutations and operations that don't require caching or public exposure
- This hybrid approach optimizes performance while maintaining security

### Database Layer
- Prisma is used as the primary ORM for type-safe database operations
- Schema definitions are centralized in Prisma, enabling:
  - Type-safe database queries
  - Easy schema migrations
  - Cross-platform compatibility (e.g., potential Python integration)

### State Management
- Client-side state is managed through stores
- Context is used for complex mutations that require both store updates and database operations
- This architecture could potentially be simplified to use stores exclusively

### Security and Performance
- Sensitive operations are handled through Server Actions to prevent exposure
- Public data is served through cached API routes for optimal performance
- Database operations are type-safe and validated through Prisma

## Contributing

We welcome contributions to Deltalytix. Please check out our [GitHub repository](https://github.com/hugodemenez/deltalytix) for more information on how to get involved.

## Support

For any questions or support, please join our [Discord community](https://discord.gg/a5YVF5Ec2n).

## License

This work is licensed under the Creative Commons Attribution-NonCommercial 4.0 International License. To view a copy of this license, visit http://creativecommons.org/licenses/by-nc/4.0/ or send a letter to Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.

You are free to:
- Share — copy and redistribute the material in any medium or format
- Adapt — remix, transform, and build upon the material

Under the following terms:
- Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.
- NonCommercial — You may not use the material for commercial purposes.

No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


## Cursor usage

You can find cursor rules in the `.cursorrules` file in the root of the project.
Also, to generate commit messages, use :
```
@Commit (Diff of Working State) Take a deep breath and work on this problem step-by-step.
Summarize the provided diff into a clear and concisely written commit message.
Use the imperative style for the subject, 
use Conventional Commits (type and optionally scope), and limit the subject+type+scope to 50 characters or less. 
Be as descriptive as possible in the unlimited length body. 
Return as a single codeblock, ready to be pasted into COMMIT_EDITMSG without further editing
```