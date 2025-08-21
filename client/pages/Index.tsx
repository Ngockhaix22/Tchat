import React, { useState, useEffect } from "react";
import { Send, Phone, User, Plus, Loader2, MessageCircle, Settings, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface Account {
  id: string;
  number: string;
  isActive?: boolean;
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

const API_BASE_URL = "http://localhost:3001";

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

  // Alert modal state
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  // Format phone number as user types
  const formatPhoneNumber = (value: string): string => {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');

  // Remove leading '1' if present (assuming it's a country code for US numbers)
  const cleanDigits = digits.startsWith('1') && digits.length > 10 ? digits.slice(1) : digits;

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

// Multi-number handling functions
const handleMultiNumberChange = (index: number, value: string) => {
  const formatted = formatPhoneNumber(value);
  const newNumbers = [...phoneNumbers];
  newNumbers[index] = formatted;
  setPhoneNumbers(newNumbers);
};

const handleMultiNumberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
  if (e.key === 'Enter' && phoneNumbers[index].trim() && phoneNumbers.length < 10) {
    e.preventDefault();
    const newNumbers = [...phoneNumbers, ""];
    setPhoneNumbers(newNumbers);
    setCurrentNumberIndex(index + 1);
    // Focus next input after a small delay
    setTimeout(() => {
      const nextInput = document.querySelector(`input[data-number-index="${index + 1}"]`) as HTMLInputElement;
      nextInput?.focus();
    }, 50);
  }
};

const removePhoneNumber = (index: number) => {
  const newNumbers = phoneNumbers.filter((_, i) => i !== index);
  // Always keep at least one empty slot for new input
  if (newNumbers.length === 0 || (newNumbers.length > 0 && newNumbers[newNumbers.length - 1].trim())) {
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
      const data = await response.json();
      setAccounts(data);
      if (data.length > 0) setSelectedAccount(data[0]);
    } catch (err) {
      console.error('Error fetching accounts:', err);
    }
  };

  // Load conversations when account changes
  useEffect(() => {
    if (selectedAccount) {
      fetchConversations(selectedAccount.id);
    }
  }, [selectedAccount]);

  const fetchConversations = async (accountId: string) => {
    setLoadingConvos(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/conversations/${accountId}`);
      const data = await res.json();

      // Transform the data to match our interface
      const transformedConversations = data.map((conv: any) => ({
        ...conv,
        lastActivity: new Date(conv.lastActivity),
        messages: conv.messages?.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })) || []
      }));

      setConversations(transformedConversations);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoadingConvos(false);
    }
  };

  const sendMessage = async () => {
    if (!selectedAccount || !selectedConversation || !message.trim()) return;

    // Handle new message case with multiple numbers
    if (selectedConversation.id === "new") {
      // Get valid phone numbers (non-empty and properly formatted)
      const validNumbers = phoneNumbers.filter(num => num.trim() && num.replace(/\D/g, "").length === 10);

      if (validNumbers.length === 0) {
        alert("Please enter at least one valid phone number");
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
        const successful = results.filter(r => r.response.success);
        const failed = results.filter(r => !r.response.success);

        if (successful.length > 0) {
          // Create conversations for successful sends
          const newConversations = successful.map(result => {
            const newMessage: Message = {
              id: result.response.messageRecord.id.toString(),
              text: message,
              fromMe: true,
              timestamp: new Date(result.response.messageRecord.timestamp)
            };

            return {
              id: result.response.conversation.id,
              number: result.response.conversation.number,
              lastMessage: message,
              messages: [newMessage],
              lastActivity: new Date(),
              unreadCount: 0
            };
          });

          setConversations(prev => [...newConversations, ...prev]);

          // Select the first successful conversation
          if (newConversations.length > 0) {
            setSelectedConversation(newConversations[0]);
          }

          setMessage("");
          setPhoneNumbers([""]);
          setCurrentNumberIndex(0);

          // Show success message
          const successMsg = `Message sent to ${successful.length} number${successful.length > 1 ? 's' : ''}`;
          const failMsg = failed.length > 0 ? ` Failed to send to ${failed.length} number${failed.length > 1 ? 's' : ''}` : '';
          alert(successMsg + failMsg);
        } else {
          alert("Failed to send message to any numbers");
        }
      } catch (err) {
        console.error('Error sending messages:', err);
        alert("Failed to send messages");
      } finally {
        setLoading(false);
      }
    } else {
      // Original single conversation logic
      const phoneNumber = selectedConversation.number;

      if (!phoneNumber || !phoneNumber.trim()) {
        alert("Please enter a phone number");
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
            timestamp: new Date(data.messageRecord.timestamp)
          };

          // Update existing conversation
          setSelectedConversation(prev => prev ? {
            ...prev,
            messages: [...prev.messages, newMessage],
            lastMessage: message,
            lastActivity: new Date()
          } : null);

          // Update conversations list
          setConversations(prev =>
            prev.map(conv =>
              conv.id === selectedConversation.id
                ? { ...conv, lastMessage: message, lastActivity: new Date() }
                : conv
            )
          );

          setMessage("");
        } else {
          alert(`Error: ${data.error}`);
        }
      } catch (err) {
        console.error('Error sending message:', err);
        alert("Failed to send message");
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

  const filteredConversations = conversations.filter(conv =>
    conv.number.includes(searchQuery)
  );

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex">
      {/* Sidebar - Accounts */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">TextFree Pro</h1>
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
                  "w-full text-left p-4 rounded-xl transition-all duration-200 group",
                  selectedAccount?.id === acc.id
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                    : "hover:bg-slate-50 text-slate-700"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span className="font-medium">{acc.number}</span>
                    </div>
                  </div>
                  <div className={cn(
                    "w-3 h-3 rounded-full",
                    acc.isActive ? "bg-green-400" : "bg-slate-300"
                  )} />
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
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Conversations</h2>
            <div className="">
              <Button
                onClick={() => {
                  setSelectedConversation({
                    id: "new",
                    number: "",
                    lastMessage: "",
                    messages: [],
                    lastActivity: new Date()
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
                  onClick={() => setSelectedConversation(conv)}
                  className={cn(
                    "w-full text-left p-4 rounded-lg transition-all duration-200 border mb-2",
                    selectedConversation?.id === conv.id
                      ? "bg-blue-50 border-blue-200"
                      : "hover:bg-slate-50 border-transparent"
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
                          {conv.unreadCount! > 0 && (
                            <Badge variant="default" className="bg-blue-500 text-xs px-2 py-0.5">
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

        {/* Floating New Message Button */}

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
                      <h3 className="font-semibold text-slate-900">New Message</h3>
                      <p className="text-sm text-slate-500">Enter a phone number to start messaging</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">Phone Numbers (Max 10)</label>
                      <span className="text-xs text-slate-500">{phoneNumbers.filter(n => n.trim()).length}/10</span>
                    </div>

                    {/* Phone number chips display */}
                    <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border border-slate-200 rounded-lg bg-slate-50">
                      {phoneNumbers.filter(n => n.trim()).map((number, index) => (
                        <div key={index} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm">
                          <span className="font-mono">{number}</span>
                          <button
                            onClick={() => removePhoneNumber(phoneNumbers.indexOf(number))}
                            className="text-blue-600 hover:text-red-500 ml-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      {phoneNumbers.filter(n => n.trim()).length === 0 && (
                        <span className="text-slate-400 text-sm">No numbers added yet</span>
                      )}
                    </div>

                    {/* Single input for adding new numbers */}
                    {phoneNumbers.length < 10 && (
                      <div className="flex items-center gap-2">
                        <Input
                          data-number-index={phoneNumbers.length - 1}
                          value={phoneNumbers[phoneNumbers.length - 1] || ""}
                          onChange={(e) => handleMultiNumberChange(phoneNumbers.length - 1, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && phoneNumbers[phoneNumbers.length - 1]?.trim() && phoneNumbers.length < 10) {
                              e.preventDefault();
                              const newNumbers = [...phoneNumbers, ""];
                              setPhoneNumbers(newNumbers);
                              setTimeout(() => {
                                const nextInput = document.querySelector(`input[data-number-index="${newNumbers.length - 1}"]`) as HTMLInputElement;
                                nextInput?.focus();
                              }, 50);
                            }
                          }}
                          placeholder="Enter phone number and press Enter"
                          className="text-sm font-mono"
                          maxLength={14}
                        />
                        <Button
                          onClick={() => {
                            const currentNumber = phoneNumbers[phoneNumbers.length - 1]?.trim();
                            if (currentNumber && phoneNumbers.length < 10) {
                              const newNumbers = [...phoneNumbers, ""];
                              setPhoneNumbers(newNumbers);
                              setTimeout(() => {
                                const nextInput = document.querySelector(`input[data-number-index="${newNumbers.length - 1}"]`) as HTMLInputElement;
                                nextInput?.focus();
                              }, 50);
                            }
                          }}
                          variant="outline"
                          size="sm"
                          disabled={!phoneNumbers[phoneNumbers.length - 1]?.trim() || phoneNumbers.length >= 10}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
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
                      <h3 className="font-semibold text-slate-900">{selectedConversation.number}</h3>
                      <p className="text-sm text-slate-500">Active conversation</p>
                    </div>
                  </div>

                  <Button variant="ghost" size="sm" className="text-slate-500">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Chat Messages */}
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4">
                {selectedConversation.messages?.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.fromMe ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm",
                        msg.fromMe
                          ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                          : "bg-white text-slate-900 border border-slate-200"
                      )}
                    >
                      <p className="text-sm">{msg.text}</p>
                      <p className={cn(
                        "text-xs mt-1",
                        msg.fromMe ? "text-blue-100" : "text-slate-500"
                      )}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="bg-white border-t border-slate-200 p-6">
              {selectedConversation.id === "new" && phoneNumbers.filter(n => n.trim()).length === 0 ? (
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
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder={selectedConversation.id === "new"
                      ? `Send message to ${phoneNumbers.filter(n => n.trim()).length} number${phoneNumbers.filter(n => n.trim()).length > 1 ? 's' : ''}...`
                      : "Type a message..."
                    }
                    className="flex-1 bg-slate-50 border-0 rounded-full px-4 py-3"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={loading || !message.trim() || (selectedConversation.id === "new" && phoneNumbers.filter(n => n.trim()).length === 0)}
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
                    lastActivity: new Date()
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
