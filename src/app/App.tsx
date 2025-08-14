"use client";
import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

import Image from "next/image";

// UI components
import Transcript from "./components/Transcript";

import BottomToolbar from "./components/BottomToolbar";

// Types
import { SessionStatus } from "@/app/types";
import type { RealtimeAgent } from '@openai/agents/realtime';

// Context providers & hooks
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { useRealtimeSession } from "./hooks/useRealtimeSession";
import { createModerationGuardrail } from "@/app/agentConfigs/guardrails";

// Agent configs
import { allAgentSets, defaultAgentSetKey } from "@/app/agentConfigs";
import { languagePracticeScenario } from "@/app/agentConfigs/languagePractice";
import { languagePracticeCompanyName } from "@/app/agentConfigs/languagePractice";

// Map used by connect logic for scenarios defined via the SDK.
const defaultSdkScenarioMap: Record<string, RealtimeAgent[]> = {
  languagePractice: languagePracticeScenario,
};

import useAudioDownload from "./hooks/useAudioDownload";
import { useHandleSessionHistory } from "./hooks/useHandleSessionHistory";

function App() {
  const searchParams = useSearchParams()!;

  // ---------------------------------------------------------------------
  // Codec selector – lets you toggle between wide-band Opus (48 kHz)
  // and narrow-band PCMU/PCMA (8 kHz) to hear what the agent sounds like on
  // a traditional phone line and to validate ASR / VAD behaviour under that
  // constraint.
  //
  // We read the `?codec=` query-param and rely on the `changePeerConnection`
  // hook (configured in `useRealtimeSession`) to set the preferred codec
  // before the offer/answer negotiation.
  // ---------------------------------------------------------------------
  const urlCodec = searchParams.get("codec") || "opus";

  // Agents SDK doesn't currently support codec selection so it is now forced 
  // via global codecPatch at module load 

  const {
    addTranscriptMessage,
    addTranscriptBreadcrumb,
  } = useTranscript();
  const { logClientEvent, logServerEvent } = useEvent();

  const [randomScenario, setRandomScenario] = useState<any>(null);
  const [customScenario, setCustomScenario] = useState<string>("");

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  // Ref to identify whether the latest agent switch came from an automatic handoff
  const handoffTriggeredRef = useRef(false);

  const sdkAudioElement = React.useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const el = document.createElement('audio');
    el.autoplay = true;
    el.style.display = 'none';
    document.body.appendChild(el);
    return el;
  }, []);

  // Attach SDK audio element once it exists (after first render in browser)
  useEffect(() => {
    if (sdkAudioElement && !audioElementRef.current) {
      audioElementRef.current = sdkAudioElement;
    }
  }, [sdkAudioElement]);

  const {
    connect,
    disconnect,
    sendUserText,
    sendEvent,
    interrupt,
    mute,
  } = useRealtimeSession({
    onConnectionChange: (s) => setSessionStatus(s as SessionStatus),
  });

  const [sessionStatus, setSessionStatus] =
    useState<SessionStatus>("DISCONNECTED");

  const [sdkScenarioMap, setSdkScenarioMap] = useState(defaultSdkScenarioMap);
  const [agentReady, setAgentReady] = useState(false);

  const [userText, setUserText] = useState<string>("");
  const [isPTTActive, setIsPTTActive] = useState<boolean>(false);
  const [isPTTUserSpeaking, setIsPTTUserSpeaking] = useState<boolean>(false);
  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] = useState<boolean>(
    () => {
      if (typeof window === 'undefined') return true;
      const stored = localStorage.getItem('audioPlaybackEnabled');
      return stored ? stored === 'true' : true;
    },
  );

  // Initialize the recording hook.
  const { startRecording, stopRecording, downloadRecording } =
    useAudioDownload();

  const sendClientEvent = (eventObj: any, eventNameSuffix = "") => {
    try {
      sendEvent(eventObj);
      logClientEvent(eventObj, eventNameSuffix);
    } catch (err) {
      console.error('Failed to send via SDK', err);
    }
  };

  useHandleSessionHistory();

  useEffect(() => {
    // Always use languagePractice scenario
    const finalAgentConfig = 'languagePractice';
    const agents = allAgentSets[finalAgentConfig];
    const agentKeyToUse = agents[0]?.name || "";
    
    // Update URL if needed
    const url = new URL(window.location.toString());
    if (url.searchParams.get("agentConfig") !== finalAgentConfig) {
      url.searchParams.set("agentConfig", finalAgentConfig);
      window.location.replace(url.toString());
      return;
    }
  }, [searchParams]);

  useEffect(() => {
    // Only connect when disconnected AND agent is ready
    if (sessionStatus === "DISCONNECTED" && agentReady) {
      connectToRealtime();
    }
  }, [sessionStatus, agentReady]);

  useEffect(() => {
    // Generate random scenario on first load
    if (!randomScenario) {
      generateRandomScenario();
    }
  }, []);

  // Update agent when scenario changes
  useEffect(() => {
    if (randomScenario && randomScenario.scenario) {
      console.log('Scenario changed, updating agent:', randomScenario.scenario);
      updateAgentScenario(randomScenario.scenario);
    }
  }, [randomScenario]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED") {
      addTranscriptBreadcrumb(`Agent: Random Roleplay`, undefined);
      updateSession(true);
    }
  }, [sessionStatus]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED") {
      updateSession();
    }
  }, [isPTTActive]);

  const fetchEphemeralKey = async (): Promise<string | null> => {
    logClientEvent({ url: "/session" }, "fetch_session_token_request");
    const tokenResponse = await fetch("/api/session");
    const data = await tokenResponse.json();
    logServerEvent(data, "fetch_session_token_response");

    if (!data.client_secret?.value) {
      logClientEvent(data, "error.no_ephemeral_key");
      console.error("No ephemeral key provided by the server");
      setSessionStatus("DISCONNECTED");
      return null;
    }

    return data.client_secret.value;
  };

  const connectToRealtime = async () => {
    const agentSetKey = searchParams.get("agentConfig") || "default";
    
    // Get the current scenario map from state
    const currentScenarioMap = sdkScenarioMap;
    console.log('Connecting with scenario map:', currentScenarioMap);
    
    if (currentScenarioMap[agentSetKey]) {
      if (sessionStatus !== "DISCONNECTED") return;
      setSessionStatus("CONNECTING");

      try {
        const EPHEMERAL_KEY = await fetchEphemeralKey();
        if (!EPHEMERAL_KEY) return;

        // Use the current agents from the scenario map
        const agents = currentScenarioMap[agentSetKey];
        console.log('Connecting with agents:', agents);

        const companyName = languagePracticeCompanyName;
        const guardrail = createModerationGuardrail(companyName);

        await connect({
          getEphemeralKey: async () => EPHEMERAL_KEY,
          initialAgents: agents,
          audioElement: sdkAudioElement,
          outputGuardrails: [guardrail],
          extraContext: {
            addTranscriptBreadcrumb,
          },
        });
      } catch (err) {
        console.error("Error connecting via SDK:", err);
        setSessionStatus("DISCONNECTED");
      }
      return;
    }
  };

  const disconnectFromRealtime = () => {
    disconnect();
    setSessionStatus("DISCONNECTED");
    setIsPTTUserSpeaking(false);
  };

  const sendSimulatedUserMessage = (text: string) => {
    const id = uuidv4().slice(0, 32);
    addTranscriptMessage(id, "user", text, true);

    sendClientEvent({
      type: 'conversation.item.create',
      item: {
        id,
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    });
    sendClientEvent({ type: 'response.create' }, '(simulated user text message)');
  };

  const updateSession = (shouldTriggerResponse: boolean = false) => {
    // Reflect Push-to-Talk UI state by (de)activating server VAD on the
    // backend. The Realtime SDK supports live session updates via the
    // `session.update` event.
    const turnDetection = isPTTActive
      ? null
      : {
          type: 'server_vad',
          threshold: 0.9,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
          create_response: true,
        };

    sendEvent({
      type: 'session.update',
      session: {
        turn_detection: turnDetection,
      },
    });

    // Send an initial greeting message to trigger the agent to greet the user
    if (shouldTriggerResponse) {
      sendSimulatedUserMessage('Bonjour');
    }
    return;
  }

  const handleSendTextMessage = () => {
    if (!userText.trim()) return;
    interrupt();

    try {
      sendUserText(userText.trim());
    } catch (err) {
      console.error('Failed to send via SDK', err);
    }

    setUserText("");
  };

  const handleTalkButtonDown = () => {
    if (sessionStatus !== 'CONNECTED') return;
    interrupt();

    setIsPTTUserSpeaking(true);
    sendClientEvent({ type: 'input_audio_buffer.clear' }, 'clear PTT buffer');

    // No placeholder; we'll rely on server transcript once ready.
  };

  const handleTalkButtonUp = () => {
    if (sessionStatus !== 'CONNECTED' || !isPTTUserSpeaking)
      return;

    setIsPTTUserSpeaking(false);
    sendClientEvent({ type: 'input_audio_buffer.commit' }, 'commit PTT');
    sendClientEvent({ type: 'response.create' }, 'trigger response PTT');
  };

  const onToggleConnection = () => {
    if (sessionStatus === "CONNECTED" || sessionStatus === "CONNECTING") {
      disconnectFromRealtime();
      setSessionStatus("DISCONNECTED");
    } else {
      connectToRealtime();
    }
  };

  const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAgentConfig = e.target.value;
    const url = new URL(window.location.toString());
    url.searchParams.set("agentConfig", newAgentConfig);
    window.location.replace(url.toString());
  };



  const generateRandomScenario = () => {
    const scenarioTypes = ['family', 'business', 'social', 'creative'];
    const randomType = scenarioTypes[Math.floor(Math.random() * scenarioTypes.length)];
    
    const scenarios = {
      family: [
        "Parent trying to convince teenager to stay in school",
        "Sibling trying to convince brother to share his new toy",
        "Child trying to convince parent to get a pet",
        "Teenager trying to convince parent to let them go to a party"
      ],
      business: [
        "Entrepreneur pitching startup to skeptical VC",
        "Employee asking boss for a significant raise",
        "Salesperson trying to sell expensive product to reluctant customer",
        "Freelancer negotiating higher rates with client"
      ],
      social: [
        "Activist trying to convince neighbor to support environmental cause",
        "Teacher trying to convince parent to help with homework",
        "Community organizer trying to get volunteers for project",
        "Friend trying to convince friend to apologize to someone"
      ],
      creative: [
        "Artist trying to convince gallery owner to exhibit their work",
        "Writer trying to convince publisher to accept their manuscript",
        "Musician trying to convince venue owner to book their band",
        "Designer trying to convince client to approve their concept"
      ]
    };
    
    const typeScenarios = scenarios[randomType as keyof typeof scenarios];
    const selectedScenario = typeScenarios[Math.floor(Math.random() * typeScenarios.length)];
    
    setRandomScenario({
      type: randomType,
      scenario: selectedScenario,
      userGoal: `Convince the AI agent to agree to your request in the scenario: ${selectedScenario}`,
      tips: [
        "Use logical arguments and evidence",
        "Address their concerns directly", 
        "Show empathy for their perspective",
        "Be persistent but respectful"
      ]
    });

    // Update the agent's instructions with the new scenario
    updateAgentScenario(selectedScenario);
  };

  // Update the agent's scenario instructions
  const updateAgentScenario = async (scenario: string) => {
    console.log('Updating agent scenario to:', scenario); // Debug log
    
    try {
      // Update the agent configuration with the new scenario
      const { createRandomRoleplayAgent } = await import('./agentConfigs/languagePractice/randomRoleplay');
      const newAgent = createRandomRoleplayAgent(scenario);
      
      console.log('Created new agent with scenario:', scenario);
      console.log('New agent created successfully');
      
      // Update the scenario map with the new agent
      setSdkScenarioMap(prev => {
        const newMap = {
          ...prev,
          languagePractice: [newAgent]
        };
        console.log('Updated scenario map:', newMap);
        return newMap;
      });
      
      // Mark agent as ready for connection
      setAgentReady(true);
      console.log('Agent is now ready with scenario:', scenario);
      
      // If already connected, refresh the connection to use the new agent
      if (sessionStatus === "CONNECTED") {
        console.log('Disconnecting to refresh agent with new scenario...'); // Debug log
        // Disconnect and reconnect to update the agent with new scenario
        disconnectFromRealtime();
        // Small delay to ensure clean disconnection
        setTimeout(() => {
          console.log('Reconnecting with new agent...'); // Debug log
          // Force a fresh connection with the new agent
          window.location.reload();
        }, 100);
      } else {
        console.log('Not connected yet, new agent will be used on next connection');
      }
    } catch (error) {
      console.error('Failed to update agent scenario:', error);
    }
  };

  // Because we need a new connection, refresh the page when codec changes
  const handleCodecChange = (newCodec: string) => {
    const url = new URL(window.location.toString());
    url.searchParams.set("codec", newCodec);
    window.location.replace(url.toString());
  };

  useEffect(() => {
    const storedPushToTalkUI = localStorage.getItem("pushToTalkUI");
    if (storedPushToTalkUI) {
      setIsPTTActive(storedPushToTalkUI === "true");
    }

    const storedAudioPlaybackEnabled = localStorage.getItem(
      "audioPlaybackEnabled"
    );
    if (storedAudioPlaybackEnabled) {
      setIsAudioPlaybackEnabled(storedAudioPlaybackEnabled === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("pushToTalkUI", isPTTActive.toString());
  }, [isPTTActive]);



  useEffect(() => {
    localStorage.setItem(
      "audioPlaybackEnabled",
      isAudioPlaybackEnabled.toString()
    );
  }, [isAudioPlaybackEnabled]);

  useEffect(() => {
    if (audioElementRef.current) {
      if (isAudioPlaybackEnabled) {
        audioElementRef.current.muted = false;
        audioElementRef.current.play().catch((err) => {
          console.warn("Autoplay may be blocked by browser:", err);
        });
      } else {
        // Mute and pause to avoid brief audio blips before pause takes effect.
        audioElementRef.current.muted = true;
        audioElementRef.current.pause();
      }
    }

    // Toggle server-side audio stream mute so bandwidth is saved when the
    // user disables playback. 
    try {
      mute(!isAudioPlaybackEnabled);
    } catch (err) {
      console.warn('Failed to toggle SDK mute', err);
    }
  }, [isAudioPlaybackEnabled]);

  // Ensure mute state is propagated to transport right after we connect or
  // whenever the SDK client reference becomes available.
  useEffect(() => {
    if (sessionStatus === 'CONNECTED') {
      try {
        mute(!isAudioPlaybackEnabled);
      } catch (err) {
        console.warn('mute sync after connect failed', err);
      }
    }
  }, [sessionStatus, isAudioPlaybackEnabled]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED" && audioElementRef.current?.srcObject) {
      // The remote audio stream from the audio element.
      const remoteStream = audioElementRef.current.srcObject as MediaStream;
      startRecording(remoteStream);
    }

    // Clean up on unmount or when sessionStatus is updated.
    return () => {
      stopRecording();
    };
  }, [sessionStatus]);

  const agentSetKey = searchParams.get("agentConfig") || "default";

  return (
    <div className="text-base flex flex-col h-screen bg-gray-100 text-gray-800 relative">
      <div className="p-5 text-lg font-semibold flex justify-between items-center">
        <div
          className="flex items-center cursor-pointer"
          onClick={() => window.location.reload()}
        >
          <div>
            <Image
              src="/openai-logomark.svg"
              alt="OpenAI Logo"
              width={20}
              height={20}
              className="mr-2"
            />
          </div>
          <div>
            Language Practice <span className="text-gray-500">with AI Agents</span>
          </div>
        </div>
        <div className="flex items-center">
          <div className="text-sm text-gray-600">
            Random Roleplay Language Practice
          </div>



            <div className="flex items-center ml-6">
              <label className="flex items-center text-base gap-1 mr-2 font-medium">
                Agent
              </label>
              <div className="relative inline-block">
                <select


                  className="appearance-none border border-gray-300 rounded-lg text-base px-2 py-1 pr-8 cursor-pointer font-normal focus:outline-none"
                >

                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-600">
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 10.44l3.71-3.21a.75.75 0 111.04 1.08l-4.25 3.65a.75.75 0 01-1.04 0L5.21 8.27a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {agentSetKey === 'languagePractice' && (
            <div className="flex items-center ml-6">

              <div className="relative inline-block">
                <select


                  className="appearance-none border border-gray-300 rounded-lg text-base px-2 py-1 pr-8 cursor-pointer font-normal focus:outline-none"
                >

                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-600">
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 10.44l3.71-3.21a.75.75 0 111.04 1.08l-4.25 3.65a.75.75 0 01-1.04 0L5.21 8.27a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 gap-2 px-2 overflow-hidden relative">
        <div className="flex flex-col flex-1 gap-2">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-2">
            <h3 className="font-semibold text-blue-900 mb-2">
              🎭 Random Roleplay Language Practice
            </h3>
            
            {/* Custom Scenario Input */}
            <div className="mb-4">
              <label className="block text-blue-900 text-sm font-medium mb-2">
                💡 Optional: Describe your own scenario
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customScenario}
                  onChange={(e) => setCustomScenario(e.target.value)}
                  placeholder="e.g., 'I want to convince my boss to give me a raise'"
                  className="flex-1 px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => {
                    if (customScenario.trim()) {
                      setRandomScenario({
                        type: 'custom',
                        scenario: customScenario.trim(),
                        userGoal: `Convince the AI agent to agree to your request: ${customScenario.trim()}`,
                        tips: [
                          "Use logical arguments and evidence",
                          "Address their concerns directly",
                          "Show empathy for their perspective",
                          "Be persistent but respectful"
                        ]
                      });
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Use This Scenario
                </button>
              </div>
            </div>

            {/* Current Scenario Display */}
            {randomScenario ? (
              <>
                <p className="text-blue-800 text-sm mb-2">
                  <strong>Current Scenario:</strong> {randomScenario.scenario}
                </p>
                <p className="text-blue-800 text-sm mb-2">
                  <strong>Your Goal:</strong> {randomScenario.userGoal}
                </p>
                <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                  <p className="text-blue-900 text-sm font-semibold mb-2">💡 Tips for Success:</p>
                  <ul className="text-blue-800 text-sm space-y-1">
                    {randomScenario.tips.map((tip: string, index: number) => (
                      <li key={index}>• {tip}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={generateRandomScenario}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                  >
                    🎲 Generate Random Scenario
                  </button>
                  {customScenario.trim() && (
                    <button
                      onClick={() => {
                        setCustomScenario("");
                        setRandomScenario(null);
                      }}
                      className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors"
                    >
                      Clear Custom Scenario
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-blue-800 text-sm mb-3">
                  Click "Generate Random Scenario" to start, or describe your own scenario above.
                </p>
                <button
                  onClick={generateRandomScenario}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  🎲 Generate Random Scenario
                </button>
              </div>
            )}
          </div>
          
          <Transcript
            userText={userText}
            setUserText={setUserText}
            onSendMessage={handleSendTextMessage}
            downloadRecording={downloadRecording}
            canSend={
              sessionStatus === "CONNECTED"
            }
          />
        </div>


      </div>

      <BottomToolbar
        sessionStatus={sessionStatus}
        onToggleConnection={onToggleConnection}
        isPTTActive={isPTTActive}
        setIsPTTActive={setIsPTTActive}
        isPTTUserSpeaking={isPTTUserSpeaking}
        handleTalkButtonDown={handleTalkButtonDown}
        handleTalkButtonUp={handleTalkButtonUp}

        isAudioPlaybackEnabled={isAudioPlaybackEnabled}
        setIsAudioPlaybackEnabled={setIsAudioPlaybackEnabled}
        codec={urlCodec}
        onCodecChange={handleCodecChange}
      />
    </div>
  );
}

export default App;
