import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import MainLayout from "@/layouts/main-layout";
import { useLanguage } from "@/hooks/use-language";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";

export default function HelpPage() {
  const { user, isLoading } = useAuth();
  const { translate } = useLanguage();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  const teacherFAQs = [
    {
      question: translate("teacher_faq_1_question"),
      answer: translate("teacher_faq_1_answer")
    },
    {
      question: translate("teacher_faq_2_question"),
      answer: translate("teacher_faq_2_answer")
    },
    {
      question: translate("teacher_faq_3_question"),
      answer: translate("teacher_faq_3_answer")
    }
  ];

  const studentFAQs = [
    {
      question: translate("student_faq_1_question"),
      answer: translate("student_faq_1_answer")
    },
    {
      question: translate("student_faq_2_question"),
      answer: translate("student_faq_2_answer")
    },
    {
      question: translate("student_faq_3_question"),
      answer: translate("student_faq_3_answer")
    }
  ];

  const faqs = user.role === "teacher" ? teacherFAQs : studentFAQs;

  return (
    <MainLayout>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">{translate("help_center")}</h1>
          <p className="text-neutral-500">{translate("help_description")}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">{translate("frequently_asked_questions")}</h2>
              
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                    <AccordionContent>{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
          
          <div>
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">{translate("contact_support")}</h2>
              <p className="text-neutral-600 mb-4">{translate("need_more_help")}</p>
              <a 
                href="mailto:support@sulongedukasyon.edu.ph" 
                className="inline-block bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors duration-200"
              >
                {translate("email_support")}
              </a>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}