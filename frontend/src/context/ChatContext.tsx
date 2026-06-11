"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';

function generateId(): string {
  return crypto.randomUUID();
}

export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
};

export type ChatSession = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type ChartDataset = {
  name: string;
  data: number[];
  color?: string;
};

export type ChartData = {
  chart_type: string;
  title: string;
  x_label?: string;
  y_label?: string;
  labels: string[];
  datasets: ChartDataset[];
  meta?: Record<string, any>;
};

export type ModelMetric = {
  model_name: string;
  metric_name: string;
  value: number;
  extra?: Record<string, any>;
};

export type FeatureImportance = {
  feature: string;
  importance: number;
};

export type AnalysisResult = {
  task_type: string;
  task_reason: string;
  model_results?: ModelMetric[];
  feature_importance?: FeatureImportance[];
  predictions?: Record<string, any>;
  executive_summary: string;
  key_insights: string[];
  recommendations: string[];
  trend_analysis?: string;
  anomalies?: string[];
  forecast?: { step: number; forecast: number }[];
};

export type SceneDecision = {
  detected_scene: string;
  confidence: number;
  best_season: string;
  activities: string;
  safety: string;
  recommendation_text?: string;
};

export type DatasetStats = {
  rows: number;
  columns: number;
  missingValues: number;
  dataTypes: Record<string, string>;
  previewColumns: string[];
  previewData: any[][];
  numeric_summary?: Record<string, Record<string, number | null>>;
  correlation_matrix?: Record<string, Record<string, number>>;
  outlier_counts?: Record<string, number>;
  missing_per_column?: Record<string, number>;
};

export type FileAnalysis = {
  id: string;
  filename: string;
  file_type: string;
  size: number;
  summary?: string;
  key_findings?: string[];
  confidence_score?: number;
  stats?: DatasetStats;
  charts?: ChartData[];
  analysis?: AnalysisResult;
  scene_decision?: SceneDecision;
  predicted_class?: string;
  risks?: string[];
  recommendations?: string[];
  next_actions?: string[];
};

type ChatContextType = {
  sessions: ChatSession[];
  currentSessionId: string | null;
  messages: Message[];
  files: FileAnalysis[];
  isLoading: boolean;
  setCurrentSessionId: (id: string | null) => void;
  createNewSession: () => void;
  sendMessage: (content: string) => Promise<void>;
  uploadFile: (file: File) => Promise<void>;
  fetchSessions: () => Promise<void>;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [files, setFiles] = useState<FileAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSessions = async () => {
    try {
      const data = await api.getSessions();
      setSessions(data);
      if (data.length > 0 && !currentSessionId) {
        setCurrentSessionId(data[0].id);
      } else if (data.length === 0) {
        createNewSession();
      }
    } catch (error) {
      console.error("Failed to fetch sessions", error);
    }
  };

  const fetchSessionDetail = async (sessionId: string) => {
    try {
      const detail = await api.getSession(sessionId);
      setMessages(detail.messages || []);
      setFiles(detail.files || []);
    } catch (error: any) {
      if (error?.response?.status === 404) {
        setMessages([]);
        setFiles([]);
      } else {
        console.error("Failed to fetch session detail", error);
      }
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (currentSessionId) {
      fetchSessionDetail(currentSessionId);
    }
  }, [currentSessionId]);

  const createNewSession = () => {
    const newId = generateId();
    setCurrentSessionId(newId);
    setMessages([]);
    setFiles([]);
  };

  const sendMessage = async (content: string) => {
    if (!currentSessionId) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    const assistantMsgId = generateId();
    let currentAssistantContent = "";

    setMessages(prev => [
      ...prev,
      { id: assistantMsgId, role: 'assistant', content: '', timestamp: new Date() }
    ]);

    try {
      await api.streamChat(content, currentSessionId, (chunk) => {
        currentAssistantContent += chunk;
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMsgId ? { ...msg, content: currentAssistantContent } : msg
          )
        );
      });
      fetchSessions();
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'system',
        content: 'Error communicating with AI server.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadFile = async (file: File) => {
    if (!currentSessionId) return;
    setIsLoading(true);
    try {
      const response = await api.uploadFile(file, currentSessionId);
      setFiles(prev => [...prev, response]);

      let summaryContent = ``;
      if (response.summary) {
          summaryContent = "```text\n" + response.summary + "\n```";
      } else {
          summaryContent = `📎 **Uploaded:** ${file.name}`;
      }

      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: summaryContent,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ChatContext.Provider value={{
      sessions, currentSessionId, messages, files, isLoading,
      setCurrentSessionId, createNewSession, sendMessage, uploadFile, fetchSessions
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
