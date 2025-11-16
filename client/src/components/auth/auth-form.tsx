import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { t } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function AuthForm() {
  const { loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("login");

  // Create schemas with plain English messages
  const loginSchema = z.object({
    username: z.string().min(1, "This field is required"),
    password: z.string().min(1, "This field is required"),
  });

  const registerSchema = z.object({
    username: z.string().min(3, "Must be at least 3 characters"),
    password: z.string().min(6, "Must be at least 6 characters"),
    confirmPassword: z.string().min(1, "This field is required"),
    fullName: z.string().min(1, "This field is required"),
    role: z.enum(["teacher", "student"], {
      required_error: "This field is required",
    }),
    class: z.string().optional(),
  }).refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

  type LoginValues = z.infer<typeof loginSchema>;
  type RegisterValues = z.infer<typeof registerSchema>;

  // Login form
  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Registration form
  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      role: "student",
      class: "",
    },
  });

  // Handle login submission
  const onLoginSubmit = (values: LoginValues) => {
    loginMutation.mutate(values);
  };

  // Handle registration submission
  const onRegisterSubmit = (values: RegisterValues) => {
    registerMutation.mutate(values);
  };

  return (
    <Card className="auth-card">
      <CardHeader className="px-4 pt-4">
        <CardTitle className="text-3xl font-bold text-center text-white">SulongEdukasyon</CardTitle>
        <CardDescription className="text-center text-yellow-200 text-lg mt-2">
          {activeTab === "login" 
            ? "Sign In"
            : "Register"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-pink border-2 border-yellow rounded-full overflow-hidden">
            <TabsTrigger value="login" className="data-[state=active]:bg-yellow data-[state=active]:text-black rounded-full text-white">Sign In</TabsTrigger>
            <TabsTrigger value="register" className="data-[state=active]:bg-yellow data-[state=active]:text-black rounded-full text-white">Register</TabsTrigger>
          </TabsList>
          
          {/* Login Form */}
          <TabsContent value="login">
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Email" className="custom-input" {...field} />
                      </FormControl>
                      <FormMessage className="text-yellow-200" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Password" className="custom-input" {...field} />
                      </FormControl>
                      <FormMessage className="text-yellow-200" />
                    </FormItem>
                  )}
                />
                

                
                <Button 
                  type="submit" 
                  className="custom-button w-full mt-6" 
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </Form>
          </TabsContent>
          
          {/* Registration Form */}
          <TabsContent value="register">
            <Form {...registerForm}>
              <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                <FormField
                  control={registerForm.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Full Name" className="custom-input" {...field} />
                      </FormControl>
                      <FormMessage className="text-yellow-200" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={registerForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Username" className="custom-input" {...field} />
                      </FormControl>
                      <FormMessage className="text-yellow-200" />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Password" className="custom-input" {...field} />
                        </FormControl>
                        <FormMessage className="text-yellow-200" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Confirm</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Confirm Password" className="custom-input" {...field} />
                        </FormControl>
                        <FormMessage className="text-yellow-200" />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={registerForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Role</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="custom-input">
                            <SelectValue placeholder="Select Role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white border-2 border-yellow rounded-xl">
                          <SelectItem value="student" className="hover:bg-lightPink rounded-md my-1 mx-2">Student</SelectItem>
                          <SelectItem value="teacher" className="hover:bg-lightPink rounded-md my-1 mx-2">Teacher</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-yellow-200" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={registerForm.control}
                  name="class"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Class Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="6-A" className="custom-input" {...field} />
                      </FormControl>
                      <FormMessage className="text-yellow-200" />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="custom-button w-full mt-6" 
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Register"
                  )}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
