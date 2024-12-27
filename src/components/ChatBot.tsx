import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MessageCircle,
  SendHorizonal,
  Loader2,
  Image as ImageIcon,
  FileText,
  Headphones,
  Info,
  Trash2,
} from "lucide-react";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

interface ChatBotProps {
  className?: string;
}

interface DbStats {
  total_records: number;
  types: string[];
  related_records?: number;
  latest_update?: string;
}

const SUGGESTED_QUERIES = [
  "¿Cuál es la última imagen en la base de datos?",
  "¿Hay alguna imagen similar a la última subida?",
  "¿Cuál es el sentimiento general de los últimos textos?",
  "Resume los últimos 3 documentos",
  "¿Hay audios en español?",
];

const ChatBot = ({ className }: ChatBotProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isTyping, setIsTyping] = useState(false);

  // Scroll to bottom when messages change
  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector(
          "[data-radix-scroll-area-viewport]"
        );
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }
    };
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: text,
      role: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          history: messages.map(({ content, role }) => ({ content, role })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: "assistant",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (data.data) {
        setDbStats(data.data);
      }
    } catch (error) {
      console.error("Error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      let userFriendlyMessage =
        "Lo siento, hubo un error procesando tu mensaje: ";

      if (errorMessage.includes("model_not_found")) {
        userFriendlyMessage +=
          "Hay un problema con el modelo de AI. Por favor, contacta al administrador.";
      } else if (errorMessage.includes("rate_limit")) {
        userFriendlyMessage +=
          "Estamos procesando demasiadas peticiones. Por favor, espera un momento y vuelve a intentar.";
      } else if (errorMessage.includes("invalid_request_error")) {
        userFriendlyMessage +=
          "La solicitud no es válida. Por favor, intenta reformular tu pregunta.";
      } else {
        userFriendlyMessage += "Por favor, intenta de nuevo en unos momentos.";
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          content: userFriendlyMessage,
          role: "assistant",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  const clearChat = () => {
    setMessages([]);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "image":
        return <ImageIcon className="w-4 h-4" />;
      case "text":
        return <FileText className="w-4 h-4" />;
      case "audio":
        return <Headphones className="w-4 h-4" />;
      default:
        return <MessageCircle className="w-4 h-4" />;
    }
  };

  const MessageBubble = ({ message }: { message: Message }) => {
    const isUser = message.role === "user";

    return (
      <div
        className={`flex gap-3 ${
          isUser ? "justify-end" : "justify-start"
        } group`}
      >
        {/* Avatar con la imagen de capybara para el bot */}
        {!isUser && (
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback>AI</AvatarFallback>
            <AvatarImage src="/capi.jpeg" />
          </Avatar>
        )}

        <div
          className={`rounded-lg px-4 py-2 max-w-[85%] break-words ${
            isUser ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
        >
          <div className="text-sm whitespace-pre-wrap leading-normal">
            {message.content}
          </div>
          <span className="text-xs opacity-50 mt-1 block">
            {message.timestamp.toLocaleTimeString()}
          </span>
        </div>

        {/* Avatar del usuario */}
        {isUser && (
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback>US</AvatarFallback>
            <AvatarImage src="/user-avatar.png" />
          </Avatar>
        )}
      </div>
    );
  };

  return (
    <Card className={`w-full flex flex-col ${className}`}>
      <CardContent className="flex-1 flex flex-col p-4 h-full overflow-hidden">
        {/* Header con la imagen de capybara en pequeño */}
        <div className="flex items-center justify-between shrink-0 mb-2">
          <div className="flex items-center gap-2">
            {/* Cambiamos el texto y la imagen para “Capi”, asistente de SIRIUS Verse */}
            <img
              src="/capi.jpeg"
              alt="Capi Icon"
              className="w-5 h-5 rounded-full"
            />
            <h3 className="font-medium">
              Capi: Asistente del SIRIUS Verse
            </h3>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearChat}
                className="ml-2"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Info de la base de datos (si la hay) */}
          {dbStats && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Info className="w-4 h-4" />
                    {dbStats.total_records} registros
                    {dbStats.related_records !== undefined && (
                      <Badge variant="secondary" className="ml-2">
                        {dbStats.related_records} relacionados
                      </Badge>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-2">
                    <p className="font-medium">Tipos de contenido:</p>
                    <div className="flex gap-2 flex-wrap">
                      {dbStats.types.map((type) => (
                        <Badge
                          key={type}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {getTypeIcon(type)}
                          {type}
                        </Badge>
                      ))}
                    </div>
                    {dbStats.latest_update && (
                      <p className="text-xs text-muted-foreground">
                        Última actualización:{" "}
                        {new Date(dbStats.latest_update).toLocaleString()}
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Área de mensajes con scroll */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full" ref={scrollAreaRef}>
            <div className="space-y-4 pb-4 pr-4">
              {/* Estado vacío con la imagen grande de capybara y texto actualizado */}
              {messages.length === 0 ? (
                <div className="text-center space-y-4 py-8 px-2">
                  <img
                    src="/capi.jpeg"
                    alt="Capi Icon"
                    className="w-12 h-12 mx-auto rounded-full"
                  />
                  <div className="space-y-2">
                    <h4 className="font-medium">
                      ¡Hola! Me llamo Capi.
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Soy tu asistente en el SIRIUS Verse. ¡Pregúntame lo que
                      necesites y con gusto te ayudaré!
                    </p>
                  </div>
                  {/* Botones de sugerencia */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                    {SUGGESTED_QUERIES.map((query, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="justify-start text-sm whitespace-normal break-words"
                        onClick={() => handleSendMessage(query)}
                      >
                        {query}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                  {isTyping && (
                    <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
                      <img
                        src="/capi.jpeg"
                        alt="Capi Icon"
                        className="w-4 h-4 rounded-full"
                      />
                      <span className="text-sm">Escribiendo...</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Footer con input y badges */}
        <div className="mt-4 shrink-0">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Haz tu pregunta o comenta algo..."
              className="flex-1"
              disabled={isLoading}
              ref={inputRef}
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SendHorizonal className="h-4 w-4" />
              )}
            </Button>
          </form>

          <div className="flex flex-wrap gap-2 mt-2 px-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1 cursor-help"
                  >
                    <ImageIcon className="w-3 h-3" />
                    Imágenes disponibles
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Puedo analizar y comparar imágenes</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1 cursor-help"
                  >
                    <FileText className="w-3 h-3" />
                    Textos y documentos
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Puedo analizar contenido textual</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1 cursor-help"
                  >
                    <Headphones className="w-3 h-3" />
                    Audio disponible
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Puedo analizar transcripciones de audio</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatBot;
