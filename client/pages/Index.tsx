
import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Phone,
  User,
  Plus,
  Loader2,
  MessageCircle,
  Settings,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Account {
  id: string;
  number: string;
  isActive?: boolean;
  unreadCount?: number;
  lastActivity?: Date;
}

interface Message {
  id: string;
  text: string;
  fromMe: boolean;
  timestamp: Date;
}

interface Conversation {
  id: string;
  number: string;
  lastMessage: string;
  unreadCount?: number;
  messages: Message[];
  lastActivity: Date;
}

const API_BASE_URL = 'http://localhost:3001'; 

const MultiAccountTextFree = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessageNumber, setNewMessageNumber] = useState("");
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>([""]);
  const [currentNumberIndex, setCurrentNumberIndex] = useState(0);
  const [lastMessageCounts, setLastMessageCounts] = useState<Record<string, number>>({});
  const [isPolling, setIsPolling] = useState(false);
  const [lastPollingTime, setLastPollingTime] = useState<Date | null>(null);
  
  // Enhanced storage for per-account data
  const [accountConversations, setAccountConversations] = useState<Record<string, Conversation[]>>({});
  const [accountLastSync, setAccountLastSync] = useState<Record<string, Date>>({});

  // Add ref for chat container auto-scroll
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Improved scroll to bottom function
  const scrollToBottom = (force = false) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: force ? 'auto' : 'smooth',
        block: 'end'
      });
    }
  };

  // Alternative scroll method using the container ref - ENHANCED
  const scrollToBottomContainer = (force = false) => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      
      // For ScrollArea components, we need to find the actual scrollable viewport
      const viewport = container.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      const scrollTarget = viewport || container;
      
      const scrollHeight = scrollTarget.scrollHeight;
      const height = scrollTarget.clientHeight;
      const maxScrollTop = scrollHeight - height;
      
      if (force) {
        scrollTarget.scrollTop = maxScrollTop;
      } else {
        scrollTarget.scrollTo({
          top: maxScrollTop,
          behavior: 'smooth'
        });
      }
    }
  };

  // Format phone number as user types
  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "");

    // Remove leading '1' if present (assuming it's a country code for US numbers)
    const cleanDigits =
      digits.startsWith("1") && digits.length > 10 ? digits.slice(1) : digits;

    // Format as (XXX) XXX-XXXX if 10 digits, otherwise return raw digits
    if (cleanDigits.length === 10) {
      return `(${cleanDigits.slice(0, 3)}) ${cleanDigits.slice(3, 6)}-${cleanDigits.slice(6, 10)}`;
    } else {
      return cleanDigits; // Return unformatted if not exactly 10 digits
    }
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setNewMessageNumber(formatted);
  };

  // Custom toast function with 2 second auto-hide
  const showToast = (
    message: string,
    type: "success" | "error" | "warning" = "error",
  ) => {
    if (type === "success") {
      toast.success(message, { duration: 2000 });
    } else if (type === "warning") {
      toast.warning(message, { duration: 2000 });
    } else {
      toast.error(message, { duration: 2000 });
    }
  };

  // Multi-number handling functions
  const handleMultiNumberChange = (index: number, value: string) => {
    const formatted = formatPhoneNumber(value);
    const newNumbers = [...phoneNumbers];
    newNumbers[index] = formatted;
    setPhoneNumbers(newNumbers);
  };

  const handleMultiNumberKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (
      e.key === "Enter" &&
      phoneNumbers[index].trim() &&
      phoneNumbers.length < 10
    ) {
      e.preventDefault();
      const newNumbers = [...phoneNumbers, ""];
      setPhoneNumbers(newNumbers);
      setCurrentNumberIndex(index + 1);
      // Focus next input after a small delay
      setTimeout(() => {
        const nextInput = document.querySelector(
          `input[data-number-index="${index + 1}"]`,
        ) as HTMLInputElement;
        nextInput?.focus();
      }, 50);
    }
  };

  const removePhoneNumber = (index: number) => {
    const newNumbers = phoneNumbers.filter((_, i) => i !== index);
    // Always keep at least one empty slot for new input
    if (
      newNumbers.length === 0 ||
      (newNumbers.length > 0 && newNumbers[newNumbers.length - 1].trim())
    ) {
      newNumbers.push("");
    }
    setPhoneNumbers(newNumbers);
    if (currentNumberIndex >= newNumbers.length) {
      setCurrentNumberIndex(newNumbers.length - 1);
    }
  };

  // Load accounts
  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/accounts`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setAccounts(data);
      if (data.length > 0) setSelectedAccount(data[0]);
    } catch (err: any) {
      console.error("Error fetching accounts:", err);

      // Show user-friendly error message
      let errorMessage = "Failed to load accounts";
      if (err.name === "TypeError" && err.message.includes("fetch")) {
        errorMessage = "Cannot connect to server - check your connection";
      } else if (err.message.includes("HTTP")) {
        errorMessage = `Server error: ${err.message}`;
      }

      showToast(errorMessage, "error");
    }
  };

  // Load conversations when account changes - ENHANCED
  useEffect(() => {
    if (selectedAccount) {
      // Load cached conversations first for immediate display
      const cachedConvos = accountConversations[selectedAccount.id] || [];
      setConversations(cachedConvos);
      
      // Then fetch fresh data
      fetchConversations(selectedAccount.id);
      
      // Mark account as read when selected
      setAccounts(prev => prev.map(acc => 
        acc.id === selectedAccount.id 
          ? { ...acc, unreadCount: 0 }
          : acc
      ));
    }
  }, [selectedAccount]);

  // Effect to update selected conversation when conversations change - IMPROVED
  useEffect(() => {
    if (selectedConversation && selectedConversation.id !== "new") {
      const updatedConversation = conversations.find(
        conv => conv.id === selectedConversation.id
      );
      
      if (updatedConversation && 
          updatedConversation.messages.length !== selectedConversation.messages.length) {
        // Update selected conversation with new messages
        setSelectedConversation(updatedConversation);
        
        // Auto-scroll to bottom when new messages arrive - multiple methods for reliability
        setTimeout(() => {
          scrollToBottom();
          scrollToBottomContainer();
        }, 100);
        
        // Backup scroll after a longer delay
        setTimeout(() => {
          scrollToBottom(true);
          scrollToBottomContainer(true);
        }, 300);
      }
    }
  }, [conversations, selectedConversation]);

  // Scroll to bottom whenever selectedConversation changes - ENHANCED
  useEffect(() => {
    if (selectedConversation && selectedConversation.messages.length > 0) {
      // Force immediate scroll when conversation changes
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        scrollToBottom(true);
        scrollToBottomContainer(true);
      });
      
      setTimeout(() => {
        scrollToBottom(true);
        scrollToBottomContainer(true);
      }, 50);
      
      setTimeout(() => {
        scrollToBottom(true);
        scrollToBottomContainer(true);
      }, 150);
      
      setTimeout(() => {
        scrollToBottom(true);
        scrollToBottomContainer(true);
      }, 400);
      
      // Final backup scroll
      setTimeout(() => {
        scrollToBottom(true);
        scrollToBottomContainer(true);
      }, 800);
    }
  }, [selectedConversation?.id, selectedConversation?.messages?.length]);

  // Auto-polling system - Enhanced to poll all accounts
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      if (!isPolling && accounts.length > 0) {
        setIsPolling(true);
        try {
          // Poll all accounts, but prioritize selected account
          const accountsToPoll = selectedAccount 
            ? [selectedAccount, ...accounts.filter(acc => acc.id !== selectedAccount.id)]
            : accounts;

          for (const account of accountsToPoll) {
            await fetchConversationsWithChangeDetection(account.id);
          }
          setLastPollingTime(new Date());
        } catch (err) {
          console.error('Auto-polling error:', err);
        } finally {
          setIsPolling(false);
        }
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [accounts, isPolling, selectedAccount, lastMessageCounts]);

  // Enhanced change detection with per-account tracking - UPDATED TO USE myStatus
  const fetchConversationsWithChangeDetection = async (accountId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/getConvertion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: parseInt(accountId) }),
      });

      if (!res.ok) {
        console.error("Auto-polling API error:", res.status);
        return;
      }

      const data = await res.json();

      if (data.success && data.data) {
        const processedConversations = processTextFreeMessages(data.data);
        const previousConversations = accountConversations[accountId] || [];

        // Track new unread messages by comparing with previous state
        const newUnreadMessages: Array<{
          conversationId: string, 
          conversationNumber: string, 
          unreadCount: number,
          lastMessage: string
        }> = [];

        processedConversations.forEach(conv => {
          const prevConv = previousConversations.find(p => p.id === conv.id);
          const prevUnreadCount = prevConv?.unreadCount || 0;
          
          // If this conversation has more unread messages than before
          if (conv.unreadCount > prevUnreadCount) {
            const newUnreadCount = conv.unreadCount - prevUnreadCount;
            newUnreadMessages.push({
              conversationId: conv.id,
              conversationNumber: conv.number,
              unreadCount: newUnreadCount,
              lastMessage: conv.lastMessage
            });
          }

          // If this is the currently selected conversation, mark as read
          if (selectedConversation?.id === conv.id && selectedAccount?.id === accountId) {
            conv.unreadCount = 0;
          }
        });

        // Update account conversations
        setAccountConversations(prev => ({
          ...prev,
          [accountId]: processedConversations
        }));

        // Update current conversations if this is the selected account
        if (selectedAccount?.id === accountId) {
          setConversations(processedConversations);
        }

        // Update sync time
        setAccountLastSync(prev => ({
          ...prev,
          [accountId]: new Date()
        }));

        // Show notifications for new unread messages
        if (newUnreadMessages.length > 0) {
          const totalNewUnread = newUnreadMessages.reduce((total, msg) => total + msg.unreadCount, 0);
          const mostRecentActivity = processedConversations.length > 0 
            ? processedConversations[0].lastActivity 
            : new Date();

          // Update account unread count
          const totalAccountUnread = processedConversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0);
          setAccounts(prev => prev.map(acc => {
            if (acc.id === accountId) {
              return {
                ...acc,
                unreadCount: selectedAccount?.id === accountId ? 0 : totalAccountUnread,
                lastActivity: mostRecentActivity
              };
            }
            return acc;
          }));

          // Show detailed notifications
          if (selectedAccount?.id !== accountId) {
            // Not the currently selected account - show account-level notification
            const account = accounts.find(acc => acc.id === accountId);
            const accountNumber = account ? account.number : `Account ${accountId}`;
            
            if (newUnreadMessages.length === 1) {
              const msg = newUnreadMessages[0];
              showToast(
                `${msg.unreadCount} new message${msg.unreadCount > 1 ? 's' : ''} on ${accountNumber} from ${msg.conversationNumber}: "${msg.lastMessage.substring(0, 50)}${msg.lastMessage.length > 50 ? '...' : ''}"`, 
                "success"
              );
            } else {
              showToast(
                `${totalNewUnread} new messages on ${accountNumber} from ${newUnreadMessages.length} contacts`, 
                "success"
              );
            }
          } else {
            // Same account but different conversations
            const otherMessages = newUnreadMessages.filter(msg => msg.conversationId !== selectedConversation?.id);
            if (otherMessages.length > 0) {
              const totalOtherUnread = otherMessages.reduce((total, msg) => total + msg.unreadCount, 0);
              
              if (otherMessages.length === 1) {
                const msg = otherMessages[0];
                showToast(
                  `${msg.unreadCount} new message${msg.unreadCount > 1 ? 's' : ''} from ${msg.conversationNumber}: "${msg.lastMessage.substring(0, 50)}${msg.lastMessage.length > 50 ? '...' : ''}"`, 
                  "success"
                );
              } else {
                showToast(
                  `${totalOtherUnread} new message${totalOtherUnread > 1 ? 's' : ''} from ${otherMessages.length} other conversation${otherMessages.length > 1 ? 's' : ''}`, 
                  "success"
                );
              }
            }
          }
        }
      }
    } catch (err) {
      // Silent error handling for auto-polling
      console.error(`Auto-polling failed for account ${accountId}:`, err);
    }
  };

  // UPDATED fetchConversations to use myStatus
  const fetchConversations = async (accountId: string) => {
    setLoadingConvos(true);
    try {
      console.log(
        `Fetching conversations for account ${accountId} from ${API_BASE_URL}/api/getConvertion`,
      );

      const res = await fetch(`${API_BASE_URL}/api/getConvertion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: parseInt(accountId) }),
      });

      console.log("Response status:", res.status);

      if (!res.ok) {
        let errorText = "";
        try {
          const errorData = await res.json();
          errorText = errorData.error || errorData.message || "Unknown error";
        } catch {
          errorText = `HTTP ${res.status} error`;
        }
        console.error("API response error:", res.status, errorText);
        showToast(`API Error: ${res.status} - ${errorText}`, "error");
        return;
      }

      const data = await res.json();
      console.log("API response data:", data);

      if (data.success && data.data) {
        // Parse the nested JSON in the response
        const processedConversations = processTextFreeMessages(data.data);
        console.log("Processed conversations:", processedConversations);
        setConversations(processedConversations);
        
        // Store in account conversations cache
        setAccountConversations(prev => ({
          ...prev,
          [accountId]: processedConversations
        }));

        // Update account unread count based on actual unread messages
        const totalUnread = processedConversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0);
        setAccounts(prev => prev.map(acc => 
          acc.id === accountId 
            ? { ...acc, unreadCount: totalUnread }
            : acc
        ));
        
        showToast(
          `Loaded ${processedConversations.length} conversations`,
          "success",
        );
      } else {
        console.error(
          "Failed to fetch conversations:",
          data.error || "Unknown error",
        );
        showToast(
          `Failed to load conversations: ${data.error || "Unknown error"}`,
          "error",
        );
      }
    } catch (err: any) {
      console.error("Error fetching conversations:", err);

      // More detailed error messages
      let errorMessage = "Error loading conversations";
      if (err.name === "TypeError" && err.message.includes("fetch")) {
        errorMessage = "Cannot connect to server - is the API server running?";
      } else if (err.message.includes("body stream already read")) {
        errorMessage = "Response parsing error - please try again";
      } else if (err.message) {
        errorMessage = `Error: ${err.message}`;
      }

      showToast(errorMessage, "error");
    } finally {
      setLoadingConvos(false);
    }
  };

  const processTextFreeMessages = (apiResponse: any): Conversation[] => {
    const conversationsMap = new Map<string, Conversation>();

    console.log("Processing API response:", apiResponse);
    console.log("Type of apiResponse:", typeof apiResponse);

    // Safety check
    if (!apiResponse) {
      console.log("No API response provided");
      return [];
    }

    // Parse JSON string if needed
    let parsedResponse;
    if (typeof apiResponse === 'string') {
      try {
        parsedResponse = JSON.parse(apiResponse);
        console.log("Parsed JSON string successfully");
      } catch (err) {
        console.error("Failed to parse JSON string:", err);
        return [];
      }
    } else {
      parsedResponse = apiResponse;
    }

    console.log("Parsed response:", parsedResponse);

    // Extract the newCommunications array directly
    const messages = parsedResponse?.result?.newCommunications;
    
    if (!Array.isArray(messages)) {
      console.log("No newCommunications array found in response");
      return [];
    }

    console.log(`Found ${messages.length} messages to process`);

    messages.forEach((msg: any) => {
      if (msg.type !== "message") return;

      // Determine the other party's number
      let otherPartyNumber = "";
      let displayName = "";

      if (msg.direction === "out") {
        // Outgoing message - get recipient
        const recipient = msg.to[0];
        otherPartyNumber = recipient.TN;
        displayName = recipient.name || formatPhoneForDisplay(recipient.TN);
      } else {
        // Incoming message - get sender
        otherPartyNumber = msg.from.TN;
        displayName = formatPhoneForDisplay(msg.from.TN);
      }

      // Create conversation key
      const conversationKey = otherPartyNumber;

      // Get or create conversation
      if (!conversationsMap.has(conversationKey)) {
        conversationsMap.set(conversationKey, {
          id: `conv_${otherPartyNumber}`,
          number: displayName,
          lastMessage: "",
          messages: [],
          lastActivity: new Date(),
          unreadCount: 0,
        });
      }

      const conversation = conversationsMap.get(conversationKey)!;

      // Add message to conversation with unread status
      const transformedMessage: Message = {
        id: msg.id,
        text: msg.text,
        fromMe: msg.direction === "out",
        timestamp: new Date(msg.timeCreated),
      };

      conversation.messages.push(transformedMessage);
      conversation.lastMessage = msg.text;
      conversation.lastActivity = new Date(msg.timeCreated);

      // Count unread messages using myStatus field
      if (msg.myStatus === "UNREAD" && msg.direction === "in") {
        conversation.unreadCount = (conversation.unreadCount || 0) + 1;
      }
    });

    // Sort messages within each conversation by timestamp
    conversationsMap.forEach((conversation) => {
      conversation.messages.sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
      );
      // Update last activity to the most recent message
      if (conversation.messages.length > 0) {
        const lastMessage =
          conversation.messages[conversation.messages.length - 1];
        conversation.lastActivity = lastMessage.timestamp;
      }
    });

    // Convert to array and sort by last activity (most recent first)
    const conversationsArray = Array.from(conversationsMap.values());
    return conversationsArray.sort(
      (a, b) => b.lastActivity.getTime() - a.lastActivity.getTime(),
    );
  };

  // Format phone number for display
  const formatPhoneForDisplay = (phoneNumber: string): string => {
    // Remove country code if present (1 prefix)
    const cleaned = phoneNumber.replace(/^\+?1?/, "");
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phoneNumber;
  };

  // FIXED markConversationAsRead function
  const markConversationAsRead = (conversationId: string) => {
    if (!selectedAccount) return;
    
    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId
          ? { ...conv, unreadCount: 0 }
          : conv
      )
    );

    // Use consistent key format - FIXED
    const countKey = `${selectedAccount.id}_${conversationId}`;
    setLastMessageCounts(prev => {
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        return { ...prev, [countKey]: conversation.messages.length };
      }
      return prev;
    });
  };

  // Improved conversation selection with immediate read marking and scroll
  const handleConversationSelect = (conv: Conversation) => {
    setSelectedConversation(conv);
    markConversationAsRead(conv.id);
    
    // Force immediate scroll to bottom when selecting conversation
    // Multiple attempts with different timings to ensure it works
    setTimeout(() => {
      scrollToBottom(true);
      scrollToBottomContainer(true);
    }, 10);
    
    setTimeout(() => {
      scrollToBottom(true);
      scrollToBottomContainer(true);
    }, 100);
    
    setTimeout(() => {
      scrollToBottom(true);
      scrollToBottomContainer(true);
    }, 300);
    
    setTimeout(() => {
      scrollToBottom(true);
      scrollToBottomContainer(true);
    }, 500);
  };

  const sendMessage = async () => {
    if (!selectedAccount || !selectedConversation || !message.trim()) return;

    // Handle new message case with multiple numbers
    if (selectedConversation.id === "new") {
      // Get valid phone numbers (non-empty and properly formatted)
      const validNumbers = phoneNumbers.filter(
        (num) => num.trim() && num.replace(/\D/g, "").length === 10,
      );

      if (validNumbers.length === 0) {
        showToast("Please enter at least one valid phone number", "warning");
        return;
      }

      setLoading(true);

      try {
        // Send message to all valid numbers
        const sendPromises = validNumbers.map(async (phoneNumber) => {
          const res = await fetch(`${API_BASE_URL}/api/send-message`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              accountId: parseInt(selectedAccount.id),
              phoneNumber: phoneNumber.replace(/\D/g, ""),
              message,
            }),
          });
          return { phoneNumber, response: await res.json() };
        });

        const results = await Promise.all(sendPromises);

        // Process results
        const successful = results.filter((r) => r.response.success);
        const failed = results.filter((r) => !r.response.success);

        if (successful.length > 0) {
          // Create conversations for successful sends
          const newConversations = successful.map((result) => {
            const newMessage: Message = {
              id: result.response.messageRecord.id.toString(),
              text: message,
              fromMe: true,
              timestamp: new Date(result.response.messageRecord.timestamp),
            };

            return {
              id: result.response.conversation.id,
              number: result.response.conversation.number,
              lastMessage: message,
              messages: [newMessage],
              lastActivity: new Date(),
              unreadCount: 0,
            };
          });

          setConversations((prev) => [...newConversations, ...prev]);

          // Select the first successful conversation
          if (newConversations.length > 0) {
            setSelectedConversation(newConversations[0]);
          }

          setMessage("");
          setPhoneNumbers([""]);
          setCurrentNumberIndex(0);

          // Show success message
          const successMsg = `Message sent to ${successful.length} number${successful.length > 1 ? "s" : ""}`;
          if (failed.length === 0) {
            showToast(successMsg, "success");
          } else {
            const failMsg = ` Failed to send to ${failed.length} number${failed.length > 1 ? "s" : ""}`;
            showToast(successMsg + failMsg, "warning");
          }

          // Scroll to bottom after sending
          setTimeout(() => {
            scrollToBottom(true);
            scrollToBottomContainer(true);
          }, 100);
        } else {
          showToast("Failed to send message to any numbers", "error");
        }
      } catch (err) {
        console.error("Error sending messages:", err);
        showToast("Failed to send messages", "error");
      } finally {
        setLoading(false);
      }
    } else {
      // Original single conversation logic
      const phoneNumber = selectedConversation.number;

      if (!phoneNumber || !phoneNumber.trim()) {
        showToast("Please enter a phone number", "warning");
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/send-message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: parseInt(selectedAccount.id),
            phoneNumber: phoneNumber.replace(/\D/g, ""),
            message,
          }),
        });

        const data = await res.json();

        if (data.success) {
          // Update local conversation with new message
          const newMessage: Message = {
            id: data.messageRecord.id.toString(),
            text: message,
            fromMe: true,
            timestamp: new Date(data.messageRecord.timestamp),
          };

          // Update existing conversation
          setSelectedConversation((prev) =>
            prev
              ? {
                  ...prev,
                  messages: [...prev.messages, newMessage],
                  lastMessage: message,
                  lastActivity: new Date(),
                }
              : null,
          );

          // Update conversations list
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === selectedConversation.id
                ? { 
                    ...conv, 
                    messages: [...conv.messages, newMessage],
                    lastMessage: message, 
                    lastActivity: new Date() 
                  }
                : conv,
            ),
          );

          // Update message count for this conversation with consistent key - FIXED
          setLastMessageCounts(prev => {
            const countKey = `${selectedAccount.id}_${selectedConversation.id}`;
            return {
              ...prev,
              [countKey]: (prev[countKey] || 0) + 1
            };
          });

          setMessage("");

          // Auto-scroll to bottom after sending - multiple attempts for reliability
          setTimeout(() => {
            scrollToBottom();
            scrollToBottomContainer();
          }, 50);
          
          setTimeout(() => {
            scrollToBottom(true);
            scrollToBottomContainer(true);
          }, 150);
          
          setTimeout(() => {
            scrollToBottom(true);
            scrollToBottomContainer(true);
          }, 300);
        } else {
          showToast(`Error: ${data.error}`, "error");
        }
      } catch (err) {
        console.error("Error sending message:", err);
        showToast("Failed to send message", "error");
      } finally {
        setLoading(false);
      }
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 1) return "just now";
    if (hours < 24) return `${Math.floor(hours)}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.number.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex">
      {/* Sidebar - Accounts */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center relative">
              <MessageCircle className="w-5 h-5 text-white" />
              {(() => {
                const totalUnread = accounts.reduce((total, acc) => total + (acc.unreadCount || 0), 0);
                return totalUnread > 0 ? (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </div>
                ) : null;
              })()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">T Chat</h1>
              <p className="text-sm text-slate-500">Multi-Account Messaging</p>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
              Phone Numbers
            </h2>
            {accounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => {
                  setSelectedAccount(acc);
                  setSelectedConversation(null);
                }}
                className={cn(
                  "w-full text-left p-4 rounded-xl transition-all duration-200 group relative",
                  selectedAccount?.id === acc.id
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                    : "hover:bg-slate-50 text-slate-700",
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span className="font-medium">{acc.number}</span>
                    </div>
                    {acc.lastActivity && (
                      <p className="text-xs mt-1 opacity-75">
                        Last activity: {formatTime(acc.lastActivity)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {(acc.unreadCount || 0) > 0 && (
                      <Badge
                        variant="default"
                        className="bg-red-500 text-white text-xs px-2 py-0.5 animate-pulse"
                      >
                        {acc.unreadCount > 99 ? '99+' : acc.unreadCount}
                      </Badge>
                    )}
                    <div
                      className={cn(
                        "w-3 h-3 rounded-full",
                        acc.isActive ? "bg-green-400" : "bg-slate-300",
                      )}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 p-4">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 text-slate-600 border-dashed hover:bg-slate-50"
          >
            <Plus className="w-4 h-4" />
            Add Phone Number
          </Button>
        </div>
      </div>

      {/* Middle - Conversations */}
      <div className="w-96 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">
                Conversations
              </h2>
              {lastPollingTime && (
                <p className="text-xs text-slate-500">
                  Last updated: {lastPollingTime.toLocaleTimeString()}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() =>
                  selectedAccount && fetchConversations(selectedAccount.id)
                }
                variant="ghost"
                size="sm"
                className="text-slate-500 hover:text-slate-700"
                disabled={loadingConvos}
              >
                {loadingConvos ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
              <Button
                onClick={() => {
                  setSelectedConversation({
                    id: "new",
                    number: "",
                    lastMessage: "",
                    messages: [],
                    lastActivity: new Date(),
                  });
                  setPhoneNumbers([""]);
                  setCurrentNumberIndex(0);
                }}
                className="rounded-full w-2 h-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg"
              >
                <Plus className="w-2 h-2" />
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by phone number..."
              className="pl-10 bg-slate-50 border-0"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loadingConvos ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="p-2">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleConversationSelect(conv)}
                  className={cn(
                    "w-full text-left p-4 rounded-lg transition-all duration-200 border mb-2",
                    selectedConversation?.id === conv.id
                      ? "bg-blue-50 border-blue-200"
                      : (conv.unreadCount || 0) > 0
                      ? "bg-red-50 border-red-200 hover:bg-red-100"
                      : "hover:bg-slate-50 border-transparent",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-500">
                      <AvatarFallback className="text-white text-sm font-medium">
                        <Phone className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-slate-900 truncate">
                          {conv.number}
                        </h3>
                        <div className="flex items-center gap-2">
                          {(conv.unreadCount || 0) > 0 && (
                            <Badge
                              variant="default"
                              className="bg-red-500 text-xs px-2 py-0.5 animate-pulse"
                            >
                              {conv.unreadCount}
                            </Badge>
                          )}
                          <span className="text-xs text-slate-500">
                            {formatTime(conv.lastActivity)}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-slate-500 truncate">
                        {conv.lastMessage}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right - Chat Window */}
      <div className="flex-1 flex flex-col bg-slate-50">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-slate-200 p-6">
              {selectedConversation.id === "new" ? (
                // New Message Header
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-500">
                      <AvatarFallback className="text-white font-medium">
                        <Plus className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        New Message
                      </h3>
                      <p className="text-sm text-slate-500">
                        Enter a phone number to start messaging
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">
                        Phone Numbers (Max 10)
                      </label>
                      <span className="text-xs text-slate-500">
                        {phoneNumbers.filter((n) => n.trim()).length}/10
                      </span>
                    </div>

                    {/* Combined chips and input in same row */}
                    <div className="flex items-center gap-2 min-h-[40px] p-3 border border-slate-200 rounded-lg bg-slate-50 flex-wrap">
                      {/* Phone number chips */}
                      {phoneNumbers
                        .filter((n) => n.trim())
                        .map((number, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm"
                          >
                            <span className="font-mono">{number}</span>
                            <button
                              onClick={() =>
                                removePhoneNumber(phoneNumbers.indexOf(number))
                              }
                              className="text-blue-600 hover:text-red-500 ml-1"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}

                      {/* Input field inline with chips */}
                      {phoneNumbers.length < 10 && (
                        <div className="flex items-center gap-1 flex-1 min-w-[200px]">
                          <Input
                            data-number-index={phoneNumbers.length - 1}
                            value={phoneNumbers[phoneNumbers.length - 1] || ""}
                            onChange={(e) =>
                              handleMultiNumberChange(
                                phoneNumbers.length - 1,
                                e.target.value,
                              )
                            }
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" &&
                                phoneNumbers[phoneNumbers.length - 1]?.trim() &&
                                phoneNumbers.length < 10
                              ) {
                                e.preventDefault();
                                const newNumbers = [...phoneNumbers, ""];
                                setPhoneNumbers(newNumbers);
                                setTimeout(() => {
                                  const nextInput = document.querySelector(
                                    `input[data-number-index="${newNumbers.length - 1}"]`,
                                  ) as HTMLInputElement;
                                  nextInput?.focus();
                                }, 50);
                              }
                            }}
                            placeholder={
                              phoneNumbers.filter((n) => n.trim()).length === 0
                                ? "Enter phone number and press Enter"
                                : "Add another..."
                            }
                            className="text-sm font-mono border-0 bg-transparent shadow-none focus-visible:ring-0 px-2"
                            maxLength={14}
                          />
                          <Button
                            onClick={() => {
                              const currentNumber =
                                phoneNumbers[phoneNumbers.length - 1]?.trim();
                              if (currentNumber && phoneNumbers.length < 10) {
                                const newNumbers = [...phoneNumbers, ""];
                                setPhoneNumbers(newNumbers);
                                setTimeout(() => {
                                  const nextInput = document.querySelector(
                                    `input[data-number-index="${newNumbers.length - 1}"]`,
                                  ) as HTMLInputElement;
                                  nextInput?.focus();
                                }, 50);
                              }
                            }}
                            variant="ghost"
                            size="sm"
                            disabled={
                              !phoneNumbers[phoneNumbers.length - 1]?.trim() ||
                              phoneNumbers.length >= 10
                            }
                            className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      )}

                      {/* Show message when no numbers and at limit */}
                      {phoneNumbers.filter((n) => n.trim()).length === 0 &&
                        phoneNumbers.length >= 10 && (
                          <span className="text-slate-400 text-sm">
                            Maximum 10 numbers reached
                          </span>
                        )}
                    </div>
                  </div>
                </div>
              ) : (
                // Existing Conversation Header
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-500">
                      <AvatarFallback className="text-white font-medium">
                        <Phone className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {selectedConversation.number}
                      </h3>
                      <p className="text-sm text-slate-500">
                        Active conversation
                      </p>
                    </div>
                  </div>

                  <Button variant="ghost" size="sm" className="text-slate-500">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Chat Messages */}
            <ScrollArea ref={chatContainerRef} className="flex-1 p-6">
              <div className="space-y-4">
                {selectedConversation.messages?.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.fromMe ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm",
                        msg.fromMe
                          ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                          : "bg-white text-slate-900 border border-slate-200",
                      )}
                    >
                      <p className="text-sm">{msg.text}</p>
                      <p
                        className={cn(
                          "text-xs mt-1",
                          msg.fromMe ? "text-blue-100" : "text-slate-500",
                        )}
                      >
                        {msg.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="bg-white border-t border-slate-200 p-6">
              {selectedConversation.id === "new" &&
              phoneNumbers.filter((n) => n.trim()).length === 0 ? (
                // Disabled state for new messages without phone numbers
                <div className="flex items-center gap-3 opacity-50">
                  <Input
                    disabled
                    placeholder="Enter phone numbers above first..."
                    className="flex-1 bg-slate-50 border-0 rounded-full px-4 py-3"
                  />
                  <Button
                    disabled
                    className="rounded-full w-12 h-12 bg-slate-300"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              ) : (
                // Active message input
                <div className="flex items-center gap-3">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder={
                      selectedConversation.id === "new"
                        ? `Send message to ${phoneNumbers.filter((n) => n.trim()).length} number${phoneNumbers.filter((n) => n.trim()).length > 1 ? "s" : ""}...`
                        : "Type a message..."
                    }
                    className="flex-1 bg-slate-50 border-0 rounded-full px-4 py-3"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={
                      loading ||
                      !message.trim() ||
                      (selectedConversation.id === "new" &&
                        phoneNumbers.filter((n) => n.trim()).length === 0)
                    }
                    className="rounded-full w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-12 h-12 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Select or start a conversation
              </h3>
              <p className="text-slate-500 mb-4">
                Choose a conversation from the sidebar or start a new one
              </p>
              <Button
                onClick={() => {
                  setSelectedConversation({
                    id: "new",
                    number: "",
                    lastMessage: "",
                    messages: [],
                    lastActivity: new Date(),
                  });
                  setPhoneNumbers([""]);
                  setCurrentNumberIndex(0);
                }}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Start New Message
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiAccountTextFree;