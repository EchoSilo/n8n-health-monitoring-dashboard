'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Fab,
  Card,
  TextField,
  IconButton,
  Typography,
  Badge,
  Avatar,
  InputAdornment,
  Fade,
  Slide,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import MinimizeIcon from '@mui/icons-material/Remove';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import { ChatMessage } from '@/types';

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0);
    }
  };

  const generateResponse = (query: string): string => {
    const q = query.toLowerCase();

    if (q.includes('server') && (q.includes('how many') || q.includes('count'))) {
      return 'You have 4 servers connected: Production-US, Production-EU, Staging, and Client-A. 2 are online, 1 is degraded, and 1 is offline.';
    }

    if (q.includes('server') && q.includes('status')) {
      return 'Server Status Report:\n• Production-US: Online (32ms ping)\n• Production-EU: Online (45ms ping)\n• Client-A: Degraded (120ms ping)\n• Staging: Offline';
    }

    if (q.includes('failed') && q.includes('workflow')) {
      return 'Found 1 failed workflow: "Data Backup" on Production-EU. The error is related to an HTTP timeout. Would you like me to analyze this error?';
    }

    if (q.includes('error') || q.includes('issue')) {
      return 'There are 5 recent errors (2 critical, 2 warnings, 1 info). The most critical is "HTTP Request Timeout" on Data Backup workflow. I have AI analysis ready for this error.';
    }

    if (q.includes('active') && q.includes('workflow')) {
      return 'You have 4 active workflows running right now:\n• Customer Sync (Production-US)\n• Email Notifications (Production-EU)\n• Report Generation (Production-US)\n• Slack Alerts (Production-EU)';
    }

    if (q.includes('help')) {
      return "I can help you with information about your n8n infrastructure. Try asking:\n• 'How many servers are online?'\n• 'Show failed workflows'\n• 'What are the recent errors?'\n• 'Server status report'";
    }

    return "I can help you with information about your servers, workflows, and errors. Try asking about 'server status', 'failed workflows', or 'recent errors'. Type 'help' for more options.";
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response delay
    setTimeout(() => {
      const responseText = generateResponse(userMessage.text);
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: responseText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);

      if (!isOpen) {
        setUnreadCount((prev) => prev + 1);
      }
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <Fade in={!isOpen}>
        <Box
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1200,
          }}
        >
          <Badge
            badgeContent={unreadCount}
            color="error"
            overlap="circular"
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.75rem',
                height: 20,
                minWidth: 20,
              },
            }}
          >
            <Fab
              onClick={handleToggle}
              aria-label="Open AI Assistant"
              sx={{
                width: 56,
                height: 56,
                background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
                boxShadow: '0 4px 20px rgba(139, 92, 246, 0.5)',
                '&:hover': {
                  transform: 'scale(1.05)',
                  boxShadow: '0 6px 30px rgba(139, 92, 246, 0.6)',
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              <ChatIcon sx={{ color: '#fff' }} />
            </Fab>
          </Badge>
        </Box>
      </Fade>

      {/* Chat Panel */}
      <Slide direction="up" in={isOpen} mountOnEnter unmountOnExit>
        <Card
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: { xs: 'calc(100% - 48px)', sm: 400 },
            height: { xs: 'calc(100% - 120px)', sm: 600 },
            maxHeight: 600,
            zIndex: 1200,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 40px rgba(0, 0, 0, 0.3)',
            bgcolor: (theme) =>
              theme.palette.mode === 'dark'
                ? 'rgba(15, 23, 42, 0.95)'
                : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: 2,
              background: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)'
                  : 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
              borderBottom: 1,
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
                  boxShadow: '0 0 15px rgba(139, 92, 246, 0.4)',
                }}
              >
                <SmartToyIcon sx={{ fontSize: 20, color: '#fff' }} />
              </Avatar>
              <Box>
                <Typography variant="subtitle2" fontWeight={600}>
                  n8n AI Assistant
                </Typography>
                <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                  Ask about your dashboard
                </Typography>
              </Box>
            </Box>
            <Box>
              <IconButton size="small" onClick={handleToggle}>
                <MinimizeIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={handleToggle}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {/* Messages */}
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              p: 2,
              bgcolor: 'background.default',
            }}
          >
            {messages.length === 0 && (
              <Box
                sx={{
                  textAlign: 'center',
                  py: 4,
                }}
              >
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  <SmartToyIcon sx={{ color: 'secondary.main' }} />
                </Avatar>
                <Typography variant="body2" color="text.primary" sx={{ mb: 1 }}>
                  Hi! I'm your n8n AI assistant.
                </Typography>
                <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                  Ask me about your workflows, servers, or errors.
                </Typography>
              </Box>
            )}

            {messages.map((msg) => (
              <Box
                key={msg.id}
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  mb: 2,
                  flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row',
                }}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: msg.sender === 'user' ? 'primary.main' : 'transparent',
                    background:
                      msg.sender === 'ai'
                        ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)'
                        : undefined,
                    boxShadow: msg.sender === 'user' ? '0 0 10px rgba(59, 130, 246, 0.4)' : undefined,
                  }}
                >
                  {msg.sender === 'user' ? (
                    <PersonIcon sx={{ fontSize: 18, color: 'primary.contrastText' }} />
                  ) : (
                    <SmartToyIcon sx={{ fontSize: 18, color: 'secondary.main' }} />
                  )}
                </Avatar>
                <Box
                  sx={{
                    maxWidth: '80%',
                  }}
                >
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor:
                        msg.sender === 'user'
                          ? (theme) =>
                              theme.palette.mode === 'dark'
                                ? 'rgba(59, 130, 246, 0.15)'
                                : 'rgba(59, 130, 246, 0.1)'
                          : (theme) =>
                              theme.palette.mode === 'dark'
                                ? 'rgba(30, 41, 59, 0.8)'
                                : 'rgba(255, 255, 255, 0.8)',
                      border: 1,
                      borderColor: msg.sender === 'user' ? 'rgba(59, 130, 246, 0.3)' : 'divider',
                      borderTopRightRadius: msg.sender === 'user' ? 0 : 16,
                      borderTopLeftRadius: msg.sender === 'ai' ? 0 : 16,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {msg.text}
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontFamily="monospace"
                    sx={{
                      display: 'block',
                      mt: 0.5,
                      textAlign: msg.sender === 'user' ? 'right' : 'left',
                    }}
                  >
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Typography>
                </Box>
              </Box>
            ))}

            {isTyping && (
              <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
                  }}
                >
                  <SmartToyIcon sx={{ fontSize: 18, color: 'secondary.main' }} />
                </Avatar>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    borderTopLeftRadius: 0,
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(30, 41, 59, 0.8)'
                        : 'rgba(255, 255, 255, 0.8)',
                    border: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {[0, 1, 2].map((i) => (
                      <Box
                        key={i}
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: 'secondary.main',
                          animation: 'bounce 1.4s infinite',
                          animationDelay: `${i * 0.16}s`,
                          '@keyframes bounce': {
                            '0%, 80%, 100%': {
                              transform: 'translateY(0)',
                            },
                            '40%': {
                              transform: 'translateY(-6px)',
                            },
                          },
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              </Box>
            )}

            <div ref={messagesEndRef} />
          </Box>

          {/* Input Area */}
          <Box
            sx={{
              p: 2,
              bgcolor: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'rgba(30, 41, 59, 0.6)'
                  : 'rgba(255, 255, 255, 0.6)',
              backdropFilter: 'blur(12px)',
              borderTop: 1,
              borderColor: 'divider',
            }}
          >
            <TextField
              fullWidth
              size="small"
              placeholder="Ask about workflows, servers..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={handleSend}
                      disabled={!inputValue.trim()}
                      size="small"
                      sx={{
                        color: 'secondary.main',
                        '&:hover': {
                          bgcolor: 'rgba(139, 92, 246, 0.1)',
                        },
                      }}
                    >
                      <SendIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </Card>
      </Slide>
    </>
  );
}
