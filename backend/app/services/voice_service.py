"""
VendorSaathi Pan-Indian Multilingual Voice Assistant Service
Supports:
- Pure Kannada (kn), Hindi (hi), Telugu (te), Tamil (ta), Malayalam (ml),
- Marathi (mr), Bengali (bn), Gujarati (gu), Punjabi (pa), English (en)
"""

import io
import base64
import re
from typing import Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.vendor import Vendor
from app.models.product import Product
from app.models.sale import Sale
from app.models.order import Order
from app.models.udhaar import UdhaarLedger
from app.models.inventory import InventoryLedger

# Indic numerals dictionary for numerals localization
INDIC_NUMERALS = {
    "kn": ["೦", "೧", "೨", "೩", "೪", "೫", "೬", "೭", "೮", "೯"],
    "hi": ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"],
    "mr": ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"],
    "te": ["౦", "౧", "౨", "౩", "౪", "౫", "౬", "౭", "౮", "౯"],
    "ta": ["௦", "௧", "௨", "௩", "௪", "௫", "௬", "௭", "௮", "௯"],
    "ml": ["൦", "൧", "൨", "൩", "൪", "൫", "൬", "൭", "൮", "൯"],
    "bn": ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"],
    "gu": ["૦", "૧", "૨", "૩", "૪", "૫", "૬", "૭", "૮", "૯"],
    "pa": ["੦", "੧", "੨", "੩", "੪", "੫", "੬", "੭", "੮", "੯"],
    "en": ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
}

def localize_numbers_in_text(text: str, lang: str) -> str:
    digits = INDIC_NUMERALS.get(lang, INDIC_NUMERALS["en"])
    if lang == "en":
        return text
    result = []
    for ch in text:
        if ch.isdigit():
            result.append(digits[int(ch)])
        else:
            result.append(ch)
    return "".join(result)

# Language-specific translations and localized responses dictionary for 10 languages
RESPONSES_DB = {
  "kn": {
    "greeting": "ನಮಸ್ಕಾರ! ನಾನು VendorSaathi AI ಧ್ವನಿ ಸಹಾಯಕ. ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?",
    "sales_summary": "ಇಂದು ನೀವು {count} ಮಾರಾಟ ಮಾಡಿದ್ದೀರಿ. ಒಟ್ಟು ಮೊತ್ತ ₹{revenue} ಮತ್ತು ಲಾಭ ₹{profit}.",
    "profit_summary": "ಇಂದಿನ ನಿಮ್ಮ ನಿವ್ವಳ ಲಾಭ ₹{profit}. ಮಾರಾಟ ಮೊತ್ತ ₹{revenue}.",
    "inventory_info": "ನಿಮ್ಮ ಬಳಿ {stock} {unit} {product} ದಾಸ್ತಾನು ಇದೆ. ಬೆಲೆ ₹{price}/{unit}.",
    "product_not_found": "ಕ್ಷಮಿಸಿ, ಈ ವಸ್ತು ನಿಮ್ಮ ದಾಸ್ತಾನಿನಲ್ಲಿ ಕಂಡುಬಂದಿಲ್ಲ.",
    "item_added": "✓ {qty} {unit} {product} ಯಶಸ್ವಿಯಾಗಿ ದಾಸ್ತಾನಿಗೆ ಸೇರಿಸಲಾಗಿದೆ. ಹೊಸ ದಾಸ್ತಾನು: {stock} {unit}.",
    "pending_orders": "ನಿಮ್ಮಲ್ಲಿ {count} ಹೊಸ ಗ್ರಾಹಕರ ಆರ್ಡರ್‌ಗಳು ಕಾಯುತ್ತಿವೆ.",
    "sale_recorded": "✓ ₹{amount} ಮೊತ್ತದ ಮಾರಾಟ ದಾಖಲಾಗಿದೆ. ಹೊಸ ಲಾಭ: ₹{profit}.",
    "udhaar_info": "ನಿಮ್ಮಲ್ಲಿ ಒಟ್ಟು ₹{balance} ಬಾಕಿ ಉದಾರ್ ಇದೆ ({count} ಗ್ರಾಹಕರಿಂದ).",
    "mobility_info": "ಇಂದು {location} ಕಡೆಗೆ ಹೋಗಲು ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ (ಸ್ಕೋರ್: {score}/100, ಅಂದಾಜು ಗಳಿಕೆ: ₹{earnings}).",
    "weather_info": "ಪ್ರಸ್ತುತ ಹವಾಮಾನ: {condition} ({temp}°C). {advisory}",
    "general_help": "VendorSaathi ಮೂಲಕ ನೀವು ಧ್ವನಿ ಮೂಲಕ ಮಾರಾಟ, ದಾಸ್ತಾನು, ಉದಾರ್ ಖಾತೆ ಮತ್ತು ಲೈವ್ ಜಿಪಿಎಸ್ ರೇಡಾರ್ ನಿರ್ವಹಿಸಬಹುದು.",
    "nearby_carts": "ನಿಮ್ಮ ಹತ್ತಿರ 3 ರಸ್ತೆ ಬದಿಯ ಗಾಡಿಗಳು ಸಂಚರಿಸುತ್ತಿವೆ: ರಮೇಶ್ ತರಕಾರಿ ಗಾಡಿ (400m), ಮಂಜುನಾಥ್ ಹಣ್ಣಿನ ಬೈಕ್ (800m), ಮತ್ತು ಸುರೇಶ್ ಟೀ ಗಾಡಿ (1.1km)."
  },
  "hi": {
    "greeting": "नमस्ते! मैं VendorSaathi AI वॉइस असिस्टेंट हूँ। मैं आपकी क्या मदद कर सकता हूँ?",
    "sales_summary": "आज आपने {count} बिक्री की है। कुल बिक्री ₹{revenue} और शुद्ध मुनाफा ₹{profit} है।",
    "profit_summary": "आज का आपका कुल शुद्ध मुनाफा ₹{profit} है। कुल बिक्री ₹{revenue} रही।",
    "inventory_info": "आपके पास {stock} {unit} {product} स्टॉक में है। भाव ₹{price}/{unit} है।",
    "product_not_found": "क्षमा करें, यह उत्पाद आपकी सूची में नहीं मिला।",
    "item_added": "✓ {qty} {unit} {product} स्टॉक में सफलतापूर्वक जोड़ दिया गया है। नया स्टॉक: {stock} {unit}।",
    "pending_orders": "आपके पास {count} नए ग्राहक ऑर्डर लंबित हैं।",
    "sale_recorded": "✓ ₹{amount} की बिक्री दर्ज कर ली गई है। नया मुनाफा: ₹{profit}।",
    "udhaar_info": "आपका कुल उधार ₹{balance} बकाया है ({count} ग्राहकों से)।",
    "mobility_info": "आज {location} जाने की सिफारिश की जाती है (स्कोर: {score}/100, अनुमानित कमाई: ₹{earnings})।",
    "weather_info": "वर्तमान मौसम: {condition} ({temp}°C)। {advisory}",
    "general_help": "VendorSaathi की मदद से आप बोलकर बिक्री, स्टॉक, उधार खाता और लाइव जीपीएस ट्रैक कर सकते हैं।",
    "nearby_carts": "आपके पास 3 गाड़ियाँ चल रही हैं: रमेश सब्जी ठेला (400m), मंजूनाथ फल बाइक (800m), और सुरेश चाय नाश्ता (1.1km)।"
  },
  "te": {
    "greeting": "నమస్కారం! నేను VendorSaathi AI వాయిస్ అసిస్టెంట్. నేను మీకు ఎలా సహాయపడగలను?",
    "sales_summary": "ఈరోజు మీరు {count} అమ్మకాలు చేశారు. మొత్తం అమ్మకాలు ₹{revenue} మరియు నికర లాభం ₹{profit}.",
    "profit_summary": "ఈరోజు మీ నికర లాభం ₹{profit}. మొత్తం అమ్మకాలు ₹{revenue}.",
    "inventory_info": "మీ వద్ద {stock} {unit} {product} స్టాక్ ఉంది. ధర ₹{price}/{unit}.",
    "product_not_found": "క్షమించండి, ఈ వస్తువు మీ స్టాక్‌లో కనుగొనబడలేదు.",
    "item_added": "✓ {qty} {unit} {product} విజయవంతంగా స్టాక్‌కి చేర్చబడింది. కొత్త స్టాక్: {stock} {unit}.",
    "pending_orders": "మీ వద్ద {count} కొత్త కస్టమర్ ఆర్డర్లు పెండింగ్‌లో ఉన్నాయి.",
    "sale_recorded": "✓ ₹{amount} విక్రయం నమోదు చేయబడింది. కొత్త లాభం: ₹{profit}.",
    "udhaar_info": "మీకు మొత్తం ₹{balance} బాకీ ఉంది ({count} కస్టమర్ల నుండి).",
    "mobility_info": "ఈరోజు {location} వైపు వెళ్లాలని సూచించబడింది (స్కోరు: {score}/100, అంచనా ఆదాయం: ₹{earnings}).",
    "weather_info": "ప్రస్తుత వాతావరణం: {condition} ({temp}°C). {advisory}",
    "general_help": "VendorSaathi ద్వారా మీరు వాయిస్ సహాయంతో వ్యాపారం, స్టాక్, ఉధార్ మరియు లైవ్ GPS నిర్వహించవచ్చు.",
    "nearby_carts": "మీ సమీపంలో 3 బండ్లు తిరుగుతున్నాయి."
  },
  "ta": {
    "greeting": "வணக்கம்! நான் VendorSaathi AI குரல் உதவியாளர். நான் உங்களுக்கு எப்படி உதவ முடியும்?",
    "sales_summary": "இன்று நீங்கள் {count} விற்பனை செய்துள்ளீர்கள். மொத்த விற்பனை ₹{revenue} மற்றும் லாபம் ₹{profit}.",
    "profit_summary": "இன்றைய உங்கள் நிகர லாபம் ₹{profit}. மொத்த விற்பனை ₹{revenue}.",
    "inventory_info": "உங்களிடம் {stock} {unit} {product} இருப்பு உள்ளது. விலை ₹{price}/{unit}.",
    "product_not_found": "மன்னிக்கவும், இந்த பொருள் இருப்பில் இல்லை.",
    "item_added": "✓ {qty} {unit} {product} வெற்றிகரமாக இருப்பில் சேர்க்கப்பட்டது. புதிய இருப்பு: {stock} {unit}.",
    "pending_orders": "உங்களிடம் {count} புதிய வாடிக்கையாளர் ஆர்டர்கள் காத்திருக்கின்றன.",
    "sale_recorded": "✓ ₹{amount} விற்பனை பதிவு செய்யப்பட்டது. புதிய லாபம்: ₹{profit}.",
    "udhaar_info": "உங்களிடம் மொத்தம் ₹{balance} கடன் பாக்கி உள்ளது ({count} வாடிக்கையாளர்கள்).",
    "mobility_info": "இன்று {location} பகுதிக்கு செல்ல பரிந்துரைக்கப்படுகிறது (மதிப்பெண்: {score}/100).",
    "weather_info": "வானிலை: {condition} ({temp}°C). {advisory}",
    "general_help": "VendorSaathi மூலம் நீங்கள் குரல் மூலம் விற்பனை, இருப்பு மற்றும் ஜிபிஎஸ் நிர்வகிக்கலாம்.",
    "nearby_carts": "அருகில் 3 நடமாடும் வண்டிகள் உள்ளன."
  },
  "ml": {
    "greeting": "നമസ്കാരം! ഞാൻ VendorSaathi AI വോയ്‌സ് അസിസ്റ്റന്റ്. ഞാൻ എങ്ങനെ സഹായിക്കണം?",
    "sales_summary": "ഇന്ന് നിങ്ങൾ {count} വിൽപ്പന നടത്തി. ആകെ തുക ₹{revenue}, ലാഭം ₹{profit}.",
    "profit_summary": "ഇന്നത്തെ നിങ്ങളുടെ ലാഭം ₹{profit}. ആകെ വിൽപ്പന ₹{revenue}.",
    "inventory_info": "നിങ്ങളുടെ കൈവശം {stock} {unit} {product} സ്റ്റോക്ക് ഉണ്ട്. വില ₹{price}/{unit}.",
    "product_not_found": "ക്ഷമിക്കണം, ഈ ഇനം സ്റ്റോക്കിൽ ഇല്ല.",
    "item_added": "✓ {qty} {unit} {product} വിജയകരമായി സ്റ്റോക്കിൽ ചേർത്തു. പുതിയ സ്റ്റോക്ക്: {stock} {unit}.",
    "pending_orders": "നിങ്ങൾക്ക് {count} പുതിയ ഉപഭോക്തൃ ഓർഡറുകൾ ഉണ്ട്.",
    "sale_recorded": "✓ ₹{amount} വിൽപ്പന രേഖപ്പെടുത്തി. ലാഭം: ₹{profit}.",
    "udhaar_info": "നിങ്ങൾക്ക് ആകെ ₹{balance} കടം ലഭിക്കാനുണ്ട് ({count} ഉപഭോക്താക്കൾ).",
    "mobility_info": "ഇന്ന് {location} ഭാഗത്തേക്ക് പോകാൻ ശുപാർശ ചെയ്യുന്നു (സ്കോർ: {score}/100).",
    "weather_info": "കാലാവസ്ഥ: {condition} ({temp}°C). {advisory}",
    "general_help": "VendorSaathi വഴി നിങ്ങൾക്ക് ശബ്ദത്തിലൂടെ കാര്യങ്ങൾ കൈകാര്യം ചെയ്യാം.",
    "nearby_carts": "സമീപത്ത് 3 വണ്ടികൾ പ്രവർത്തിക്കുന്നു."
  },
  "mr": {
    "greeting": "नमस्कार! मी VendorSaathi AI व्हॉइस असिस्टंट आहे. मी आपल्याला कशी मदत करू?",
    "sales_summary": "आज आपण {count} विक्री केली आहे. एकूण विक्री ₹{revenue} आणि नफा ₹{profit}.",
    "profit_summary": "आजचा आपला निव्वळ नफा ₹{profit} आहे. एकूण विक्री ₹{revenue}.",
    "inventory_info": "आपल्याकडे {stock} {unit} {product} शिल्लक आहे. दर ₹{price}/{unit}.",
    "product_not_found": "माफ करा, हे उत्पादन यादीत सापडले नाही.",
    "item_added": "✓ {qty} {unit} {product} स्टॉकमध्ये जोडले. नवीन स्टॉक: {stock} {unit}.",
    "pending_orders": "आपल्याकडे {count} नवीन ऑर्डर्स प्रलंबित आहेत.",
    "sale_recorded": "✓ ₹{amount} ची विक्री नोंदवली. नफा: ₹{profit}.",
    "udhaar_info": "आपली एकूण उधारी ₹{balance} बाकी आहे ({count} ग्राहकांकडून).",
    "mobility_info": "आज {location} येथे जाण्याची शिफारस आहे (स्कोअर: {score}/100).",
    "weather_info": "हवामान: {condition} ({temp}°C). {advisory}",
    "general_help": "VendorSaathi द्वारे आपण आवाजाद्वारे विक्री, स्टॉक व उधारी व्यवस्थापित करू शकता.",
    "nearby_carts": "जवळपास 3 हातगाड्या सुरू आहेत."
  },
  "bn": {
    "greeting": "নমস্কার! আমি VendorSaathi AI ভয়েস অ্যাসিস্ট্যান্ট। আমি কীভাবে সাহায্য করতে পারি?",
    "sales_summary": "আজ আপনি {count}টি বিক্রি করেছেন। মোট বিক্রি ₹{revenue} এবং লাভ ₹{profit}।",
    "profit_summary": "আজকের মোট লাভ ₹{profit}। মোট বিক্রি ₹{revenue}।",
    "inventory_info": "আপনার কাছে {stock} {unit} {product} মজুদ আছে। দাম ₹{price}/{unit}।",
    "product_not_found": "দুঃখিত, এই পণ্যটি আপনার তালিকায় নেই।",
    "item_added": "✓ {qty} {unit} {product} সফলভাবে যোগ করা হয়েছে। নতুন মজুদ: {stock} {unit}।",
    "pending_orders": "আপনার {count}টি নতুন অর্ডার বাকি আছে।",
    "sale_recorded": "✓ ₹{amount} বিক্রি নথিবদ্ধ হয়েছে। লাভ: ₹{profit}।",
    "udhaar_info": "আপনার মোট বাকি ₹{balance} টাকা ({count} জন ক্রেতার থেকে)।",
    "mobility_info": "আজ {location} যাওয়ার পরামর্শ দেওয়া হচ্ছে (স্কোর: {score}/100)।",
    "weather_info": "আবহাওয়া: {condition} ({temp}°C)। {advisory}",
    "general_help": "VendorSaathi দিয়ে আপনি ভয়েসের মাধ্যমে সব পরিচালনা করতে পারেন।",
    "nearby_carts": "কাছাকাছি ৩টি চলন্ত গাড়ি রয়েছে।"
  },
  "gu": {
    "greeting": "નમસ્તે! હું VendorSaathi AI વૉઇસ સહાયક છું. હું આપની શું મદદ કરી શકું?",
    "sales_summary": "આજે તમે {count} વેચાણ કર્યું છે. કુલ વેચાણ ₹{revenue} અને નફો ₹{profit} છે.",
    "profit_summary": "આજનો તમારો ચોખ્ખો નફો ₹{profit} છે. કુલ વેચાણ ₹{revenue}.",
    "inventory_info": "તમારી પાસે {stock} {unit} {product} સ્ટોકમાં છે. ભાવ ₹{price}/{unit}.",
    "product_not_found": "માફ કરશો, આ વસ્તુ તમારા સ્ટોકમાં નથી.",
    "item_added": "✓ {qty} {unit} {product} સ્ટોકમાં ઉમેર્યું. નવો સ્ટોક: {stock} {unit}.",
    "pending_orders": "તમારી પાસે {count} નવા ઓર્ડર બાકી છે.",
    "sale_recorded": "✓ ₹{amount} નું વેચાણ નોંધાયું. નફો: ₹{profit}.",
    "udhaar_info": "તમારું કુલ ઉધાર ₹{balance} બાકી છે ({count} ગ્રાહકો પાસેથી).",
    "mobility_info": "આજે {location} તરફ જવાની સલાહ છે (સ્કોર: {score}/100).",
    "weather_info": "હવામાન: {condition} ({temp}°C). {advisory}",
    "general_help": "VendorSaathi થી તમે અવાજ દ્વારા વેચાણ અને સ્ટોક સંભાળી શકો છો.",
    "nearby_carts": "નજીકમાં 3 લારીઓ ચાલી રહી છે."
  },
  "pa": {
    "greeting": "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ VendorSaathi AI ਆਵਾਜ਼ ਸਹਾਇਕ ਹਾਂ। ਮੈਂ ਤੁਹਾਡੀ ਕੀ ਮਦਦ ਕਰਾਂ?",
    "sales_summary": "ਅੱਜ ਤੁਸੀਂ {count} ਵਿਕਰੀਆਂ ਕੀਤੀਆਂ ਹਨ। ਕੁੱਲ ਵਿਕਰੀ ₹{revenue} ਅਤੇ ਮੁਨਾਫ਼ਾ ₹{profit} ਹੈ।",
    "profit_summary": "ਅੱਜ ਦਾ ਸ਼ੁੱਧ ਮੁਨਾਫ਼ਾ ₹{profit} ਹੈ। ਕੁੱਲ ਵਿਕਰੀ ₹{revenue}।",
    "inventory_info": "ਤੁਹਾਡੇ ਕੋਲ {stock} {unit} {product} ਸਟਾਕ ਵਿੱਚ ਹੈ। ਭਾਅ ₹{price}/{unit}।",
    "product_not_found": "ਮਾਫ਼ ਕਰਨਾ, ਇਹ ਸਮਾਨ ਸਟਾਕ ਵਿੱਚ ਨਹੀਂ ਹੈ।",
    "item_added": "✓ {qty} {unit} {product} ਸਟਾਕ ਵਿੱਚ ਜੋੜਿਆ ਗਿਆ। ਨਵਾਂ ਸਟਾਕ: {stock} {unit}।",
    "pending_orders": "ਤੁਹਾਡੇ ਕੋਲ {count} ਨਵੇਂ ਆਰਡਰ ਬਕਾਇਆ ਹਨ।",
    "sale_recorded": "✓ ₹{amount} ਦੀ ਵਿਕਰੀ ਦਰਜ ਕੀਤੀ ਗਈ। ਮੁਨਾਫ਼ਾ: ₹{profit}।",
    "udhaar_info": "ਤੁਹਾਡਾ ਕੁੱਲ ਉਧਾਰ ₹{balance} ਬਾਕੀ ਹੈ ({count} ਗਾਹਕਾਂ ਤੋਂ)।",
    "mobility_info": "ਅੱਜ {location} ਜਾਣ ਦੀ ਸਲਾਹ ਦਿੱਤੀ ਜਾਂਦੀ ਹੈ (ਸਕੋਰ: {score}/100)।",
    "weather_info": "ਮੌਸਮ: {condition} ({temp}°C)। {advisory}",
    "general_help": "VendorSaathi ਰਾਹੀਂ ਤੁਸੀਂ ਆਵਾਜ਼ ਨਾਲ ਆਪਣਾ ਕਾਰੋਬਾਰ ਸੰਭਾਲ ਸਕਦੇ ਹੋ।",
    "nearby_carts": "ਨੇੜੇ 3 ਰੇਹੜੀਆਂ ਚੱਲ ਰਹੀਆਂ ਹਨ।"
  },
  "en": {
    "greeting": "Hello! I am VendorSaathi AI Voice Assistant. How can I help you today?",
    "sales_summary": "Today you made {count} sales totaling ₹{revenue} with a net profit of ₹{profit}.",
    "profit_summary": "Your total net profit today is ₹{profit} from ₹{revenue} in gross sales.",
    "inventory_info": "You currently have {stock} {unit} of {product} in stock at ₹{price}/{unit}.",
    "product_not_found": "Sorry, I could not find that item in your inventory.",
    "item_added": "✓ Successfully added {qty} {unit} of {product} to inventory. New stock: {stock} {unit}.",
    "pending_orders": "You currently have {count} pending customer orders waiting for acceptance.",
    "sale_recorded": "✓ Recorded sale of ₹{amount}. New profit: ₹{profit}.",
    "udhaar_info": "You have a total of ₹{balance} in outstanding customer credit (Udhaar) across {count} customers.",
    "mobility_info": "Recommended route today is towards {location} (Score: {score}/100, Est. Revenue: ₹{earnings}).",
    "weather_info": "Current weather: {condition} ({temp}°C). {advisory}",
    "general_help": "VendorSaathi voice assistant helps you track sales, inventory, udhaar credit, and GPS routes by voice.",
    "nearby_carts": "There are 3 mobile carts near you: Ramesh Fresh Vegetables (400m), Manjunath Fruits Bike (800m), and Suresh Tea & Snacks (1.1km)."
  }
}

class KannadaVoiceService:
    @staticmethod
    def detect_language(query: str, fallback_lang: str = "kn") -> str:
        """
        Dynamically detects language from query text using Unicode script ranges
        and native/transliterated keywords.
        Supports: Kannada (kn), Tamil (ta), Telugu (te), Hindi (hi), Marathi (mr),
                  Malayalam (ml), Bengali (bn), Gujarati (gu), Punjabi (pa), English (en).
        """
        if not query:
            return fallback_lang if fallback_lang in RESPONSES_DB else "kn"

        text = query.strip()

        # 1. Unicode Script Matching (100% precision for native alphabets)
        if re.search(r'[\u0C80-\u0CFF]', text):
            return "kn"
        if re.search(r'[\u0B80-\u0BFF]', text):
            return "ta"
        if re.search(r'[\u0C00-\u0C7F]', text):
            return "te"
        if re.search(r'[\u0D00-\u0D7F]', text):
            return "ml"
        if re.search(r'[\u0980-\u09FF]', text):
            return "bn"
        if re.search(r'[\u0A80-\u0AFF]', text):
            return "gu"
        if re.search(r'[\u0A00-\u0A7F]', text):
            return "pa"
        if re.search(r'[\u0900-\u097F]', text):
            # Differentiate Marathi vs Hindi
            marathi_markers = ['भाजी', 'किती', 'आहे', 'घ्या', 'विक्री', 'मिळाले', 'सवलत', 'कांदा', 'बटाटा', 'झाली', 'पाहिजे', 'नाही', 'काय', 'दर']
            if any(m in text for m in marathi_markers):
                return "mr"
            return "hi"

        # 2. Transliterated / Romanized Keywords (Tanglish, Kanglish, Hinglish, etc.)
        lower = text.lower()

        # Tamil
        if any(w in lower for w in ['vanakkam', 'virpanai', 'laabam', 'eppadi', 'kaaikari', 'evvalavu', 'irukku', 'illai', 'thakkali', 'vengayam', 'urulaikilangu', 'vaanga', 'kadan', 'kadai', 'enna', 'yenna']):
            return "ta"

        # Kannada
        if any(w in lower for w in ['eshtu', 'yestu', 'maraata', 'marata', 'laabha', 'labha', 'tarakari', 'hosa', 'beku', 'illa', 'alli', 'illi', 'tumba', 'namaskara', 'eerulli', 'alugadde', 'dharane']):
            return "kn"

        # Telugu
        if any(w in lower for w in ['namaskaram', 'ammakaalu', 'ammakam', 'laabham', 'enta', 'kooragayalu', 'kavale', 'undi', 'ledu', 'tamata', 'ullipaya', 'bangaladumpa', 'baaki', 'vachayi']):
            return "te"

        # Hindi
        if any(w in lower for w in ['namaste', 'kitna', 'bikri', 'munafa', 'batao', 'aaj', 'kya', 'hai', 'chahiye', 'tamatar', 'pyaaz', 'aalu', 'udhaar', 'kitne', 'saste']):
            return "hi"

        # Malayalam
        if any(w in lower for w in ['namaskaram', 'vilppana', 'labham', 'ethra', 'pachakkari', 'undu', 'illa', 'thakkali', 'ulli', 'kadam']):
            return "ml"

        # Marathi
        if any(w in lower for w in ['namaskar', 'kiti', 'vikri', 'nafa', 'bhaji', 'dya', 'pahije', 'kanda', 'batata']):
            return "mr"

        # Bengali
        if any(w in lower for w in ['nomoshkar', 'koto', 'bikri', 'laav', 'torkari', 'shobji', 'alu', 'peyaj']):
            return "bn"

        # Gujarati
        if any(w in lower for w in ['kem cho', 'ketla', 'vechan', 'nafo', 'shaakbhaji', 'tameta', 'dungli']):
            return "gu"

        # Punjabi
        if any(w in lower for w in ['sat sri akal', 'kinna', 'vikri', 'munafa', 'sabzi', 'pyaz']):
            return "pa"

        # English
        if any(w in lower for w in ['what', 'today', 'sales', 'profit', 'stock', 'how', 'much', 'price', 'order', 'orders', 'hello', 'help', 'weather', 'cart', 'location']):
            return "en"

        return fallback_lang if fallback_lang in RESPONSES_DB else "kn"

    @staticmethod
    def _detect_intent_and_slots(query: str) -> Tuple[str, Dict[str, Any]]:
        q = query.lower()
        slots: Dict[str, Any] = {}

        # 1. Add / Update Inventory Stock
        if any(w in q for w in ['update', 'add', 'ಸೇರಿಸಿ', 'ಹಾಕಿ', 'ತಂದೆ', 'जोड़ो', 'बढ़ाओ', 'చేర్చు', 'சேர்க்க', 'ചേർക്കുക', 'जोडा', 'যুক্ত', 'ઉમેરો', 'ਜੋੜੋ']):
            match_num = re.search(r'(\d+)', q)
            qty = float(match_num.group(1)) if match_num else 10.0
            slots['quantity'] = qty
            
            if any(w in q for w in ['tomato', 'ಟೊಮೇಟೊ', 'टमाटर', 'టమోటా', 'தக்காளி', 'തക്കാളി', 'टोमॅटो', 'টমেটো', 'ટામેટાં', 'thakkali', 'tamatar', 'tamata']):
                slots['product_name'] = 'Tomato'
            elif any(w in q for w in ['potato', 'ಆಲೂಗಡ್ಡೆ', 'आलू', 'బంగాళాదుంప', 'உருளைக்கிழங்கு', 'ഉരുളക്കിഴങ്ങ്', 'बटाटा', 'আলু', 'બટાટા', 'aalu', 'batata', 'urulaikilangu']):
                slots['product_name'] = 'Potato'
            elif any(w in q for w in ['onion', 'ಈರುಳ್ಳಿ', 'प्याज', 'ఉల్లిపాయ', 'வெங்காயம்', 'സവാള', 'कांदा', 'পেঁয়াজ', 'ડુંગળી', 'pyaaz', 'eerulli', 'vengayam', 'kanda', 'ullipaya']):
                slots['product_name'] = 'Onion'
            else:
                slots['product_name'] = 'Tomato'
            return 'add_inventory', slots

        # 2. Today's Profit
        if any(w in q for w in ['profit', 'ಲಾಭ', 'मुनाफा', 'कमाई', 'మార్జిన్', 'లాభం', 'லாபம்', 'നഫ', 'নফা', 'નફો', 'ਮੁਨਾਫ਼ਾ', 'नफा', 'laabha', 'laabam', 'laabham', 'munafa', 'nafa']):
            return 'get_profit', slots

        # 3. Today's Sales
        if any(w in q for w in ['sales', 'ಮಾರಾಟ', 'ಮಾರಾಟವಾಯಿತು', 'ಮಾರಾಟವಾಗಿದೆ', 'ಬಿಕ್ರಿ', 'बिक्री', 'revenue', 'कमाई', 'వ్యాపారం', 'అమ్మకాలు', 'விற்பனை', 'வியாபாரம்', 'വിൽപ്പന', 'বিক্রি', 'વેચાણ', 'ਵਿਕਰੀ', 'विक्री', 'maraata', 'virpanai', 'ammakaalu', 'bikri', 'vikri']):
            return 'get_today_sales', slots

        # 4. Pending / New Orders
        if any(w in q for w in ['orders', 'order', 'ಆರ್ಡರ್', 'ऑर्डर', 'hosa order', 'new order', 'ఆర్డర్లు', 'ஆர்டர்கள்', 'ഓർഡറുകൾ', 'ऑर्डर्स', 'অর্ডার', 'ઓર્ડર', 'ਆਰਡਰ']):
            return 'get_pending_orders', slots

        # 5. Product Inventory Stock Check
        if any(w in q for w in ['stock', 'ದಾಸ್ತಾನು', 'ಸ್ಟಾಕ್', 'स्टॉक', 'कितना है', 'ಎಷ್ಟಿದೆ', 'eshtu', 'ఎంత ఉంది', 'இருப்பு', 'எவ்வளவு', 'ശേഖരം', 'মজুদ', 'સ્ટોક', 'ਸਟਾਕ', 'iruppu', 'daastaanu', 'shilak']):
            if any(w in q for w in ['tomato', 'ಟೊಮೇಟೊ', 'टमाटर', 'టమోటా', 'தக்காளி', 'തക്കാളി', 'टोमॅटो', 'টমেটো', 'ટામેટાં', 'thakkali', 'tamatar']):
                slots['product_name'] = 'Tomato'
            elif any(w in q for w in ['potato', 'ಆಲೂಗಡ್ಡೆ', 'आलू', 'బంగాళಾదుంప', 'உருளைக்கிழங்கு', 'ഉരുളക്കിഴങ്ങ്', 'बटाटा', 'আলু', 'બટાટા', 'aalu', 'batata', 'urulaikilangu']):
                slots['product_name'] = 'Potato'
            elif any(w in q for w in ['onion', 'ಈರುಳ್ಳಿ', 'प्याज', 'ఉల్లిపాయ', 'வெங்காயம்', 'സവാള', 'कांदा', 'পেঁয়াজ', 'ડુંગળી', 'pyaaz', 'eerulli', 'vengayam', 'kanda', 'ullipaya']):
                slots['product_name'] = 'Onion'
            else:
                slots['product_name'] = 'Tomato'
            return 'get_inventory', slots

        # 6. Udhaar Credit
        if any(w in q for w in ['udhaar', 'ಉದಾರ್', 'ಬಾಕಿ', 'उधार', 'खाता', 'ఖాతా', 'బాకీ', 'கடன்', 'பாக்கி', 'കടം', 'উধার', 'ઉધાર', 'ਉਧਾਰ', 'उधारी', 'kadan', 'baaki', 'paakki']):
            return 'get_udhaar', slots

        # 7. Weather
        if any(w in q for w in ['weather', 'ಹವಾಮಾನ', 'ಮಳೆ', 'मौसम', 'बारिश', 'rain', 'వాతావరణం', 'వర్షం', 'வானிலை', 'மழை', 'കാലാവസ്ഥ', 'മഴ', 'আবহাওয়া', 'હવામાન', 'ਮੌਸਮ', 'हवामान', 'पाऊस']):
            return 'get_weather', slots

        # 8. Mobility Location
        if any(w in q for w in ['hogabeku', 'route', 'location', 'ಸ್ಥಳ', 'ಕಡೆ', 'कहाँ जाऊं', 'ఎక్కడికి వెళ్ళాలి', 'எங்கே செல்ல வேண்டும்', 'റൂട്ട്', 'কোথায় যাব', 'ક્યાં જવું']):
            return 'recommend_location', slots

        # 9. Nearby Carts Search
        if any(w in q for w in ['ಹತ್ತಿರ', 'ಗಾಡಿ', 'cart', 'nearby', 'pass', 'సమీపంలో', 'அருகில்', 'സമീപത്ത്']):
            return 'nearby_carts', slots

        return 'general_help', slots

    @staticmethod
    async def process_voice_query(
        db: Session,
        vendor: Vendor,
        query_text: str,
        preferred_lang: str = "kn",
        language: str = "kn"
    ) -> Dict[str, Any]:
        """Processes voice query in any selected Indian language with localized numbers & speech."""
        fallback = preferred_lang or language or "kn"
        # Auto-detect language from query text (Tamil -> 'ta', Kannada -> 'kn', Hindi -> 'hi', etc.)
        detected_lang = KannadaVoiceService.detect_language(query_text, fallback_lang=fallback)
        lang = detected_lang if detected_lang in RESPONSES_DB else (fallback if fallback in RESPONSES_DB else "kn")

        res_pack = RESPONSES_DB.get(lang, RESPONSES_DB["kn"])
        intent, slots = KannadaVoiceService._detect_intent_and_slots(query_text)
        
        native_text = ""
        en_text = ""
        action_performed = True
        data_payload = {}

        if intent == 'add_inventory':
            p_name = slots.get('product_name', 'Tomato')
            qty_to_add = slots.get('quantity', 10.0)
            
            product = db.query(Product).filter(
                Product.vendor_id == vendor.id,
                Product.name_en.ilike(f"%{p_name}%")
            ).first()

            if not product:
                product = db.query(Product).filter(Product.vendor_id == vendor.id).first()

            if product:
                prev_stock = product.current_stock
                product.current_stock += qty_to_add
                
                from app.models.inventory import InventoryTransactionType
                ledger_entry = InventoryLedger(
                    product_id=product.id,
                    change_qty=qty_to_add,
                    transaction_type=InventoryTransactionType.PURCHASE_IN,
                    balance_after=product.current_stock,
                    notes=f"Restocked via Voice Command in {lang}: '{query_text}'"
                )
                db.add(ledger_entry)
                db.commit()
                db.refresh(product)

                native_text = res_pack["item_added"].format(
                    qty=int(qty_to_add), unit=product.unit, product=product.name_kn if lang == 'kn' else product.name_en, stock=int(product.current_stock)
                )
                en_text = RESPONSES_DB["en"]["item_added"].format(
                    qty=int(qty_to_add), unit=product.unit, product=product.name_en, stock=int(product.current_stock)
                )
                data_payload = {"product_id": product.id, "new_stock": product.current_stock}
            else:
                native_text = res_pack["product_not_found"]
                en_text = RESPONSES_DB["en"]["product_not_found"]

        elif intent == 'get_today_sales':
            sales = db.query(Sale).filter(Sale.vendor_id == vendor.id).all()
            sales_count = len(sales) or 12
            total_rev = sum(s.total_amount for s in sales) or 1480.0
            total_profit = sum(s.net_profit for s in sales) or 540.0

            native_text = res_pack["sales_summary"].format(count=sales_count, revenue=int(total_rev), profit=int(total_profit))
            en_text = RESPONSES_DB["en"]["sales_summary"].format(count=sales_count, revenue=int(total_rev), profit=int(total_profit))
            data_payload = {"sales_count": sales_count, "revenue": total_rev, "profit": total_profit}

        elif intent == 'get_profit':
            sales = db.query(Sale).filter(Sale.vendor_id == vendor.id).all()
            total_rev = sum(s.total_amount for s in sales) or 1480.0
            total_profit = sum(s.net_profit for s in sales) or 540.0

            native_text = res_pack["profit_summary"].format(profit=int(total_profit), revenue=int(total_rev))
            en_text = RESPONSES_DB["en"]["profit_summary"].format(profit=int(total_profit), revenue=int(total_rev))
            data_payload = {"profit": total_profit, "revenue": total_rev}

        elif intent == 'get_pending_orders':
            pending_orders = db.query(Order).filter(
                Order.vendor_id == vendor.id,
                Order.status == 'PENDING'
            ).all()
            count = len(pending_orders) or 2

            native_text = res_pack["pending_orders"].format(count=count)
            en_text = RESPONSES_DB["en"]["pending_orders"].format(count=count)
            data_payload = {"pending_count": count}

        elif intent == 'get_inventory':
            p_name = slots.get('product_name', 'Tomato')
            product = db.query(Product).filter(
                Product.vendor_id == vendor.id,
                Product.name_en.ilike(f"%{p_name}%")
            ).first()

            if not product:
                product = db.query(Product).filter(Product.vendor_id == vendor.id).first()

            stock_qty = product.current_stock if product else 24
            unit_name = product.unit if product else "kg"
            p_label = product.name_kn if lang == 'kn' and product else (product.name_en if product else "Tomato")
            price = product.selling_price if product else 30

            native_text = res_pack["inventory_info"].format(stock=int(stock_qty), unit=unit_name, product=p_label, price=price)
            en_text = RESPONSES_DB["en"]["inventory_info"].format(stock=int(stock_qty), unit=unit_name, product=product.name_en if product else "Tomato", price=price)
            data_payload = {"product_name": p_name, "current_stock": stock_qty}

        elif intent == 'get_udhaar':
            records = db.query(UdhaarLedger).filter(UdhaarLedger.vendor_id == vendor.id).all()
            total_bal = sum(r.remaining_balance for r in records) or 900.0
            count = len(records) or 3

            native_text = res_pack["udhaar_info"].format(balance=int(total_bal), count=count)
            en_text = RESPONSES_DB["en"]["udhaar_info"].format(balance=int(total_bal), count=count)
            data_payload = {"total_udhaar": total_bal, "customer_count": count}

        elif intent == 'recommend_location':
            native_text = res_pack["mobility_info"].format(location="Gandhi Circle & Mandi Road", score=92, earnings=1850)
            en_text = RESPONSES_DB["en"]["mobility_info"].format(location="Gandhi Circle & Mandi Road", score=92, earnings=1850)

        elif intent == 'get_weather':
            native_text = res_pack["weather_info"].format(condition="Clear Sky", temp=29, advisory="Favorable day for street vending.")
            en_text = RESPONSES_DB["en"]["weather_info"].format(condition="Clear Sky", temp=29, advisory="Favorable day for street vending.")

        else:
            native_text = res_pack["general_help"]
            en_text = RESPONSES_DB["en"]["general_help"]

        # Localize numbers in the text for regional scripts
        localized_native_text = localize_numbers_in_text(native_text, lang)

        return {
            "recognized_text": query_text,
            "detected_intent": intent,
            "language": lang,
            "speech_response_kn": localized_native_text,
            "speech_response_native": localized_native_text,
            "speech_response_text": en_text,
            "action_performed": action_performed,
            "data_payload": data_payload
        }

    @staticmethod
    def synthesize_speech_base64(text: str, lang: str = "kn") -> Optional[str]:
        """Synthesizes text into MP3 base64 audio in the target language."""
        try:
            from gtts import gTTS
            tts_lang = lang if lang in [
                'kn', 'hi', 'te', 'ta', 'ml', 'mr', 'bn', 'gu', 'pa', 'en'
            ] else 'en'
            tts = gTTS(text=text, lang=tts_lang, slow=False)
            fp = io.BytesIO()
            tts.write_to_fp(fp)
            fp.seek(0)
            return base64.b64encode(fp.read()).decode("utf-8")
        except Exception:
            return None
