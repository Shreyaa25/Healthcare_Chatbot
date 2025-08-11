"use client"

import { useState, useRef, useEffect } from "react"
import { Send, User, Bot, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type Message = {
  type: "user" | "bot" | "options"
  content: string | string[]
  isLoading?: boolean
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      type: "bot",
      content:
        "Welcome to the Healthcare Chatbot! I'm here to help diagnose potential health issues based on your symptoms.",
    },
    {
      type: "bot",
      content: "Let's start with your name.",
    },
  ])
  const [input, setInput] = useState("")
  const [stage, setStage] = useState<"name" | "symptom" | "days" | "followup" | "complete">("name")
  const [userName, setUserName] = useState("")
  const [currentSymptom, setCurrentSymptom] = useState("")
  const [days, setDays] = useState(0)
  const [followupSymptoms, setFollowupSymptoms] = useState<string[]>([])
  const [currentFollowupIndex, setCurrentFollowupIndex] = useState(0)
  const [experiencedSymptoms, setExperiencedSymptoms] = useState<string[]>([])
  const [diagnosis, setDiagnosis] = useState<string>("")
  const [description, setDescription] = useState<string>("")
  const [precautions, setPrecautions] = useState<string[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Mock data - in a real app, this would come from your backend
  const mockSymptoms = [
    "itching",
    "skin_rash",
    "nodal_skin_eruptions",
    "continuous_sneezing",
    "shivering",
    "chills",
    "joint_pain",
    "stomach_pain",
    "acidity",
    "ulcers_on_tongue",
    "muscle_wasting",
    "vomiting",
    "burning_micturition",
    "spotting_urination",
    "fatigue",
    "weight_gain",
    "anxiety",
    "cold_hands_and_feets",
    "mood_swings",
    "weight_loss",
    "restlessness",
    "lethargy",
    "patches_in_throat",
    "irregular_sugar_level",
    "cough",
    "high_fever",
    "sunken_eyes",
    "breathlessness",
    "sweating",
    "dehydration",
    "indigestion",
    "headache",
    "yellowish_skin",
    "dark_urine",
    "nausea",
    "loss_of_appetite",
    "pain_behind_the_eyes",
    "back_pain",
    "constipation",
    "abdominal_pain",
    "diarrhoea",
    "mild_fever",
    "yellow_urine",
    "yellowing_of_eyes",
    "acute_liver_failure",
    "swelling_of_stomach",
    "swelled_lymph_nodes",
    "malaise",
    "blurred_and_distorted_vision",
    "phlegm",
    "throat_irritation",
    "redness_of_eyes",
    "sinus_pressure",
    "runny_nose",
    "congestion",
    "chest_pain",
    "weakness_in_limbs",
    "fast_heart_rate",
    "pain_during_bowel_movements",
    "pain_in_anal_region",
    "bloody_stool",
    "irritation_in_anus",
    "neck_pain",
    "dizziness",
    "cramps",
    "bruising",
    "obesity",
    "swollen_legs",
    "swollen_blood_vessels",
    "puffy_face_and_eyes",
    "enlarged_thyroid",
    "brittle_nails",
    "swollen_extremeties",
    "excessive_hunger",
    "extra_marital_contacts",
    "drying_and_tingling_lips",
    "slurred_speech",
    "knee_pain",
    "hip_joint_pain",
    "muscle_weakness",
    "stiff_neck",
    "swelling_joints",
    "movement_stiffness",
    "spinning_movements",
    "loss_of_balance",
    "unsteadiness",
    "weakness_of_one_body_side",
    "loss_of_smell",
    "bladder_discomfort",
    "foul_smell_of_urine",
    "continuous_feel_of_urine",
    "passage_of_gases",
    "internal_itching",
    "toxic_look_(typhos)",
    "depression",
    "irritability",
    "muscle_pain",
    "altered_sensorium",
    "red_spots_over_body",
    "belly_pain",
    "abnormal_menstruation",
    "dischromic_patches",
    "watering_from_eyes",
    "increased_appetite",
    "polyuria",
    "family_history",
    "mucoid_sputum",
    "rusty_sputum",
    "lack_of_concentration",
    "visual_disturbances",
    "receiving_blood_transfusion",
    "receiving_unsterile_injections",
    "coma",
    "stomach_bleeding",
    "distention_of_abdomen",
    "history_of_alcohol_consumption",
    "fluid_overload",
    "blood_in_sputum",
    "prominent_veins_on_calf",
    "palpitations",
    "painful_walking",
    "pus_filled_pimples",
    "blackheads",
    "scurring",
    "skin_peeling",
    "silver_like_dusting",
    "small_dents_in_nails",
    "inflammatory_nails",
    "blister",
    "red_sore_around_nose",
    "yellow_crust_ooze",
  ]

  const mockDiseases = {
    "Fungal infection": {
      description: "A fungal infection, also called mycosis, is a skin disease caused by a fungus.",
      precautions: ["Bath twice", "Use Betadine", "Keep the area dry", "Use clean clothes"],
    },
    Allergy: {
      description:
        "An allergy is an immune system response to a foreign substance that's not typically harmful to your body.",
      precautions: ["Apply calamine", "Cover area with bandage", "Use ice to compress itching", "Consult doctor"],
    },
    "Common Cold": {
      description: "The common cold is a viral infection of your nose and throat (upper respiratory tract).",
      precautions: ["Drink vitamin C rich drinks", "Take vapour", "Avoid cold food", "Keep fever in check"],
    },
  }

  // Simulate backend responses
  const simulateBackendResponse = (userInput: string) => {
    if (stage === "name") {
      setUserName(userInput)
      setMessages((prev) => [
        ...prev,
        { type: "bot", content: `Hello, ${userInput}! What symptom are you experiencing?` },
      ])
      setStage("symptom")
      return
    }

    if (stage === "symptom") {
      // Find matching symptoms
      const matchedSymptoms = mockSymptoms.filter((s) =>
        s.toLowerCase().includes(userInput.toLowerCase().replace(" ", "_")),
      )

      if (matchedSymptoms.length > 0) {
        setCurrentSymptom(matchedSymptoms[0])
        setMessages((prev) => [
          ...prev,
          { type: "options", content: matchedSymptoms.slice(0, 5) },
          { type: "bot", content: "From how many days have you been experiencing this symptom?" },
        ])
        setStage("days")
      } else {
        setMessages((prev) => [
          ...prev,
          { type: "bot", content: "I couldn't find that symptom. Please try another one." },
        ])
      }
      return
    }

    if (stage === "days") {
      const numDays = Number.parseInt(userInput)
      if (isNaN(numDays)) {
        setMessages((prev) => [...prev, { type: "bot", content: "Please enter a valid number of days." }])
        return
      }

      setDays(numDays)

      // Generate some follow-up symptoms based on the current symptom
      const followups = mockSymptoms
        .filter((s) => s !== currentSymptom)
        .sort(() => 0.5 - Math.random())
        .slice(0, 5)

      setFollowupSymptoms(followups)
      setMessages((prev) => [...prev, { type: "bot", content: `Are you experiencing ${followups[0]}? (yes/no)` }])
      setStage("followup")
      return
    }

    if (stage === "followup") {
      if (userInput.toLowerCase() === "yes") {
        setExperiencedSymptoms((prev) => [...prev, followupSymptoms[currentFollowupIndex]])
      }

      const nextIndex = currentFollowupIndex + 1
      if (nextIndex < followupSymptoms.length) {
        setCurrentFollowupIndex(nextIndex)
        setMessages((prev) => [
          ...prev,
          { type: "bot", content: `Are you experiencing ${followupSymptoms[nextIndex]}? (yes/no)` },
        ])
      } else {
        // Simulate diagnosis
        const diseases = Object.keys(mockDiseases)
        const randomDisease = diseases[Math.floor(Math.random() * diseases.length)]
        setDiagnosis(randomDisease)
        setDescription(mockDiseases[randomDisease as keyof typeof mockDiseases].description)
        setPrecautions(mockDiseases[randomDisease as keyof typeof mockDiseases].precautions)

        // Calculate severity
        const severity = (experiencedSymptoms.length * days) / (experiencedSymptoms.length + 1)
        const severityMessage =
          severity > 13
            ? "You should take the consultation from doctor."
            : "It might not be that bad but you should take precautions."

        setMessages((prev) => [
          ...prev,
          { type: "bot", content: `Based on your symptoms, you may have ${randomDisease}.` },
          { type: "bot", content: mockDiseases[randomDisease as keyof typeof mockDiseases].description },
          { type: "bot", content: severityMessage },
          { type: "bot", content: "Take following measures:" },
          { type: "bot", content: mockDiseases[randomDisease as keyof typeof mockDiseases].precautions.join("\n") },
        ])
        setStage("complete")
      }
      return
    }

    if (stage === "complete") {
      setMessages((prev) => [
        ...prev,
        { type: "bot", content: "The diagnosis is complete. If you want to start over, please refresh the page." },
      ])
    }
  }

  const handleSendMessage = () => {
    if (!input.trim()) return

    // Add user message
    setMessages((prev) => [...prev, { type: "user", content: input }])

    // Add loading message
    setMessages((prev) => [...prev, { type: "bot", content: "...", isLoading: true }])

    // Simulate backend processing
    setTimeout(() => {
      // Remove loading message
      setMessages((prev) => prev.filter((msg) => !msg.isLoading))

      // Process the input
      simulateBackendResponse(input)

      // Clear input field
      setInput("")
    }, 1000)
  }

  const handleOptionSelect = (option: string) => {
    setInput(option)
    setMessages((prev) => [...prev, { type: "user", content: option }])

    // Add loading message
    setMessages((prev) => [...prev, { type: "bot", content: "...", isLoading: true }])

    // Simulate backend processing
    setTimeout(() => {
      // Remove loading message
      setMessages((prev) => prev.filter((msg) => !msg.isLoading))

      setCurrentSymptom(option)
      setMessages((prev) => [
        ...prev,
        { type: "bot", content: "From how many days have you been experiencing this symptom?" },
      ])
      setStage("days")

      // Clear input field
      setInput("")
    }, 1000)
  }

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div className="flex min-h-screen flex-col items-center justify-between p-4 md:p-24 bg-gray-50">
      <Card className="w-full max-w-3xl mx-auto shadow-lg">
        <CardHeader className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <AlertCircle className="h-6 w-6" />
            Healthcare Chatbot
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[500px] overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div key={index} className="mb-4">
                {message.type === "user" ? (
                  <div className="flex items-start gap-3 ml-auto max-w-[80%]">
                    <div className="bg-primary text-primary-foreground p-3 rounded-lg">
                      <p>{message.content}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                      <User className="h-4 w-4" />
                    </div>
                  </div>
                ) : message.type === "options" ? (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(message.content as string[]).map((option, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        onClick={() => handleOptionSelect(option)}
                        className="text-sm"
                      >
                        {option.replace(/_/g, " ")}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-start gap-3 mr-auto max-w-[80%]">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      {message.isLoading ? (
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-75"></div>
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-150"></div>
                        </div>
                      ) : (
                        <p className="whitespace-pre-line">{message.content}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <Separator />

          {stage === "complete" ? (
            <Alert className="m-4 bg-emerald-50 border-emerald-200">
              <AlertCircle className="h-4 w-4 text-emerald-500" />
              <AlertTitle>Diagnosis Complete</AlertTitle>
              <AlertDescription>
                You may have {diagnosis}. {description}
                <ul className="mt-2 list-disc pl-5">
                  {precautions.map((precaution, index) => (
                    <li key={index}>{precaution}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="p-4 flex gap-2">
              <Input
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                className="flex-1"
              />
              <Button onClick={handleSendMessage} className="bg-emerald-500 hover:bg-emerald-600">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
