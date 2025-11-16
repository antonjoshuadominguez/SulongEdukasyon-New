// Tagalog translations for the entire application
export const translations: Record<string, string> = {
  // Auth related
  "welcome": "Maligayang pagdating sa SulongEdukasyon",
  "platform_description": "Isang platform ng pag-aaral na may larong pang-edukasyon para sa mga mag-aaral ng Grade 6 Araling Panlipunan",
  "picture_puzzle": "Puzzle ng Larawan: Isanib muli ang mga makasaysayang artifact at alamin ang kanilang kahalagahan",
  "picture_matching": "Paghahanap ng Pares: Hanapin ang mga pares ng makasaysayang larawan at tuklasin ang mga katotohanan",
  "true_or_false": "Totoo o Mali: Subukan ang iyong kaalaman sa pamamagitan ng pagsagot kung totoo o mali ang mga pahayag",
  "explain_image": "Ipaliwanag ang Larawan: Sagutin ang mga tanong batay sa mga makasaysayang larawan",
  "fill_blanks": "Punan ang Patlang: Kumpletuhin ang mga makasaysayang pangungusap sa pamamagitan ng pagpunan ng mga patlang",
  "arrange_timeline": "Ayusin ang Timeline: Ayusin ang mga makasaysayang pangyayari sa tamang pagkakasunud-sunod",
  "tama_ang_ayos": "Tama ang Ayos: Ilagay ang mga bagay sa tamang kategorya o grupo",
  "already_have_account": "Mayroon ka nang account?",
  "dont_have_account": "Wala ka pang account?",
  "log_in": "Mag-login",
  "register": "Mag-rehistro",
  "username": "Username",
  "password": "Password",
  "full_name": "Buong Pangalan",
  "confirm_password": "Kumpirmahin ang Password",
  "role": "Tungkulin",
  "teacher": "Guro",
  "student": "Mag-aaral",
  "class_name_optional": "Pangalan ng Klase (Opsyonal)",
  "loading": "Naglo-load...",
  "required_field": "Kailangan punan ang field na ito",
  "min_length": "Hindi dapat mas maikli sa {0} karakter",
  "passwords_dont_match": "Hindi magkatugma ang mga password",
  
  // Navigation
  "home": "Tahanan",
  "classes": "Mga Klase",
  "statistics": "Istatistika",
  "help": "Tulong",
  "logout": "Mag-logout",
  "profile": "Profile",
  
  // Dashboard
  "teacher_dashboard": "Dashboard ng Guro",
  "student_dashboard": "Dashboard ng Mag-aaral",
  "active_games": "Mga Aktibong Laro",
  "completed_games": "Mga Nakumpletong Laro",
  "scheduled_games": "Mga Nakatakdang Laro",
  "create_new_game": "Lumikha ng Bagong Laro",
  "join_game": "Sumali sa Laro",
  "enter_lobby_code": "Ilagay ang Lobby Code",
  "join": "Sumali",
  "no_active_games": "Walang aktibong laro sa ngayon",
  
  // Game related
  "Game Leaderboard": "Leaderboard ng Laro",
  "Loading game details...": "Naglo-load ng detalye ng laro...",
  "Game scores ranked by points": "Mga iskor ng laro na inihanay ayon sa puntos",
  "Student": "Mag-aaral",
  "Score": "Iskor",
  "Time": "Oras",
  "No Scores Yet": "Wala Pang Iskor",
  "Students haven't completed this game yet. Scores will appear here as they finish.": "Hindi pa nakakumpleto ng laro ang mga mag-aaral. Lilitaw dito ang mga iskor kapag natapos na nila.",
  "Unknown Player": "Hindi Kilalang Manlalaro",
  
  // Timeline game
  "Arrange historical events": "Ayusin ang mga makasaysayang pangyayari",
  "Arrange the historical events in chronological order.": "Ayusin ang mga makasaysayang pangyayari ayon sa pagkakasunod-sunod.",
  "Submit Order": "Ipasa ang Pagkakasunod-sunod",
  "Perfect! You arranged all events in the correct order.": "Perpekto! Naiayos mo lahat ng pangyayari sa tamang pagkakasunod-sunod.",
  "You got": "Nakakuha ka ng",
  "out of": "mula sa",
  "events in the correct position.": "pangyayari sa tamang posisyon.",
  "Game completed!": "Nakumpleto ang laro!",
  
  // Common buttons and messages
  "Submit": "Ipasa",
  "Cancel": "Kanselahin",
  "Save": "I-save",
  "Edit": "I-edit",
  "Delete": "Burahin",
  "Next": "Susunod",
  "Previous": "Nakaraan",
  "Close": "Isara",
  
  // Auth form specific
  "Username": "Username",
  "Password": "Password",
  "Log In": "Mag-login",
  "Register": "Mag-rehistro",
  "Full Name": "Buong Pangalan",
  "Confirm Password": "Kumpirmahin ang Password",
  "Role": "Tungkulin",
  "Select Role": "Pumili ng Tungkulin",
  "Class Name (Optional)": "Pangalan ng Klase (Opsyonal)",
  "Loading...": "Naglo-load...",
  
  // Sidebar and navigation
  "Home": "Tahanan",
  "Dashboard": "Dashboard",
  "Classes": "Mga Klase",
  "Games": "Mga Laro",
  "Statistics": "Istatistika",
  "Help": "Tulong",
  "Log Out": "Mag-logout",
  "Profile Settings": "Mga Setting ng Profile",
  "recent_lobbies": "Mga Kamakailang Laro",
  "show_more": "Ipakita pa",
  "show_less": "Ipakita mas kaunti",
  "no_recent_lobbies": "Walang kamakailang laro",
  "playground": "Playground",
  
  // Leaderboard
  "Leaderboard": "Leaderboard",
  "Top Scores": "Mga Nangungunang Iskor",
  "This Session": "Sa Session na ito",
  "All-Time": "Lahat ng Panahon",
  "Scores for this game session": "Mga iskor para sa session ng larong ito",
  "Top scores across all games": "Mga nangungunang iskor sa lahat ng laro",
  "No scores recorded yet.": "Wala pang naitatalang iskor."
};

// Function to translate text with optional variable replacement
export function t(key: string, vars?: Record<string, any>): string {
  let translation = translations[key] || key;
  
  if (vars) {
    Object.entries(vars).forEach(([varName, value]) => {
      translation = translation.replace(new RegExp(`{{${varName}}}`, 'g'), String(value));
    });
  }
  
  return translation;
}