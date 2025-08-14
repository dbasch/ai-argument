# 🎭 Language Practice with AI Agents

A real-time voice conversation app that helps you practice languages through interactive roleplay scenarios. Built with Next.js and OpenAI's Realtime API.

## 🌟 What It Does

This app creates an immersive language learning experience where you can:

- **🎯 Practice real conversations** with AI agents in your target language
- **🎭 Engage in roleplay scenarios** like convincing a boss for a raise, negotiating with a landlord, or pitching a startup to investors
- **🗣️ Speak naturally** - the AI responds in the same language you use
- **💬 Use text or voice** - perfect for building confidence before speaking
- **🎲 Generate random scenarios** or create your own custom roleplay situations

## 🚀 How It Works

1. **Connect** to the AI agent using your OpenAI API key
2. **Generate a scenario** or describe your own roleplay situation
3. **Start conversing** - speak or type in your target language
4. **Practice persuasion** - the AI agent will always need convincing and ask thoughtful questions
5. **Get feedback** - receive tips and guidance for successful conversations

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **AI**: OpenAI Realtime API with GPT-4o Realtime
- **Voice**: WebRTC for real-time audio streaming
- **Audio**: Push-to-talk and automatic voice activity detection

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- OpenAI API key with access to Realtime API

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd openai-realtime-agents
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env.local file
   echo "OPENAI_API_KEY=your_openai_api_key_here" > .env.local
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎯 Features

### **Random Roleplay Scenarios**
- **Family**: Convince a teenager to stay in school, negotiate with a child about bedtime
- **Business**: Pitch a startup to investors, negotiate a job offer, convince a client
- **Social**: Persuade friends to join an activity, resolve conflicts
- **Creative**: Convince someone to try a new hobby, pitch creative projects

### **Custom Scenarios**
- Describe any situation you want to practice
- Set your own goals and objectives
- Get personalized tips for success

### **Language Support**
- **Speak in any language** - the AI responds in the same language
- **Perfect for language learners** - practice real conversations naturally
- **Build confidence** - start with text, then move to voice

### **Audio Controls**
- **Push-to-talk** for controlled conversations
- **Automatic voice detection** for hands-free interaction
- **Audio playback** to hear the AI's responses
- **Codec selection** for optimal audio quality

## 🌐 Deployment

### **Vercel (Recommended)**
```bash
npm i -g vercel
vercel
```

### **Other Platforms**
- **Railway**: `npm i -g @railway/cli && railway up`
- **Render**: Connect GitHub repo for auto-deploy
- **DigitalOcean**: Use App Platform for easy deployment

### **Environment Variables**
Set `OPENAI_API_KEY` on your deployment platform.

## 🔧 Development

### **Project Structure**
```
src/
├── app/
│   ├── components/          # UI components
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom hooks
│   ├── agentConfigs/       # AI agent configurations
│   └── api/                # API routes
├── types.ts                # TypeScript definitions
└── globals.css             # Global styles
```

### **Key Components**
- **`App.tsx`**: Main application logic and state
- **`Transcript.tsx`**: Conversation display and text input
- **`BottomToolbar.tsx`**: Audio controls and connection management
- **`randomRoleplay.ts`**: AI agent for roleplay scenarios

### **Available Scripts**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🎨 Customization

### **Adding New Scenarios**
1. Create a new agent in `src/app/agentConfigs/languagePractice/`
2. Define personality, instructions, and tools
3. Add to the main scenario configuration

### **Modifying AI Behavior**
- Edit agent instructions in the respective agent files
- Adjust personality traits and conversation style
- Add new tools for specific scenarios

### **UI Customization**
- Modify Tailwind classes in component files
- Update color schemes and layouts
- Add new UI components as needed

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [OpenAI Realtime API](https://platform.openai.com/docs/realtime)
- Powered by [Next.js](https://nextjs.org/) and [React](https://reactjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)

## 📞 Support

If you have questions or need help:
- Open an issue on GitHub
- Check the OpenAI Realtime API documentation
- Review the code examples in the agent configurations

---

**Happy language learning! 🎭🗣️✨**
