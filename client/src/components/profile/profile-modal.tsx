import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { User } from '@shared/schema';
import { LogOut, KeyRound, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";

interface ProfileModalProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogout: () => void;
}

export function ProfileModal({ user, open, onOpenChange, onLogout }: ProfileModalProps) {
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { updatePasswordMutation } = useAuth();

  if (!user) return null;

  const userRole = user.role === 'teacher' ? 'Teacher' : 'Student';
  const avatarInitials = getInitials(user.name || user.username);
  const fullName = user.name || user.username;

  const handlePasswordChange = async () => {
    // Reset messages
    setError("");
    setSuccess("");

    // Validate inputs
    if (!oldPassword) {
      setError("Please enter your current password");
      return;
    }
    if (!newPassword) {
      setError("Please enter a new password");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match");
      return;
    }

    try {
      await updatePasswordMutation.mutateAsync({ 
        oldPassword, 
        newPassword 
      });
      
      setSuccess("Password updated successfully!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      // Hide password change form after successful update
      setTimeout(() => {
        setShowPasswordChange(false);
        setSuccess("");
      }, 2000);
    } catch (err) {
      setError("Failed to update password. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="font-['Comic_Sans_MS'] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">My Profile</DialogTitle>
          <DialogDescription className="text-center">
            Your account details
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="h-24 w-24 rounded-full bg-gradient-to-br from-redOrange to-lightPink flex items-center justify-center text-white text-3xl font-bold">
            {avatarInitials}
          </div>
          
          <div className="text-center">
            <h3 className="text-xl font-bold text-redOrange">{fullName}</h3>
            <p className="text-pink-700 font-medium">{userRole}</p>
          </div>
          
          <div className="w-full border-t-2 border-dotted border-redOrange/30 my-2 pt-4">
            <h4 className="text-lg font-bold text-redOrange mb-2">Account Info:</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm font-medium">Username:</div>
              <div className="text-sm">{user.username}</div>
              
              <div className="text-sm font-medium">Full Name:</div>
              <div className="text-sm">{fullName}</div>
              
              <div className="text-sm font-medium">Account Type:</div>
              <div className="text-sm">{userRole}</div>
              
              {user.role === 'student' && user.class && (
                <>
                  <div className="text-sm font-medium">Section:</div>
                  <div className="text-sm">{user.class}</div>
                </>
              )}
            </div>
          </div>
          
          {!showPasswordChange ? (
            <>
              <Button 
                variant="outline" 
                className="mt-2 w-full border-2 border-yellow bg-white hover:bg-yellow/10"
                onClick={() => setShowPasswordChange(true)}
              >
                <KeyRound className="mr-2 h-4 w-4" />
                Change Password
              </Button>
              
              <Button 
                variant="destructive" 
                className="mt-2 w-full"
                onClick={onLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log Out
              </Button>
            </>
          ) : (
            <div className="w-full border-2 border-yellow rounded-xl p-4 mt-2">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-md font-bold text-redOrange">Change Password</h4>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6" 
                  onClick={() => {
                    setShowPasswordChange(false);
                    setError("");
                    setSuccess("");
                    setOldPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
              {success && <p className="text-green-500 text-sm mb-2">{success}</p>}
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-sm" htmlFor="old-password">Current Password</Label>
                  <Input 
                    id="old-password" 
                    type="password" 
                    className="custom-input"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)} 
                  />
                </div>
                
                <div className="space-y-1">
                  <Label className="text-sm" htmlFor="new-password">New Password</Label>
                  <Input 
                    id="new-password" 
                    type="password" 
                    className="custom-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)} 
                  />
                </div>
                
                <div className="space-y-1">
                  <Label className="text-sm" htmlFor="confirm-password">Confirm New Password</Label>
                  <Input 
                    id="confirm-password" 
                    type="password" 
                    className="custom-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                  />
                </div>
                
                <Button 
                  className="w-full bg-yellow hover:bg-yellow/80 text-black"
                  onClick={handlePasswordChange}
                >
                  Update Password
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
}