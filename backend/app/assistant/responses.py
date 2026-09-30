"""
VendorSaathi Assistant — Answer engine.

Turns tool results into short, natural, spoken answers in the user's language.
No fabricated data: every number in a data answer comes from the tool result.
"""
from typing import Any, Dict, Optional

# ---------------------------------------------------------------------------
# Response packs — en is complete; other languages override what they can and
# fall back to English for missing keys (mixed speech is natural for vendors).
# ---------------------------------------------------------------------------
R = {
    "sales": {
        "en": "Your sales today: {count} sales, ₹{revenue} total, ₹{profit} profit.",
        "kn": "ಇಂದಿನ ಮಾರಾಟ: {count} ಮಾರಾಟ, ಒಟ್ಟು ₹{revenue}, ಲಾಭ ₹{profit}.",
        "hi": "आज की बिक्री: {count} बिक्री, कुल ₹{revenue}, मुनाफा ₹{profit}.",
        "te": "ఈరోజు అమ్మకాలు: {count} అమ్మకాలు, మొత్తం ₹{revenue}, లాభం ₹{profit}.",
        "ta": "இன்றைய விற்பனை: {count} விற்பனை, மொத்தம் ₹{revenue}, லாபம் ₹{profit}.",
        "ml": "ഇന്നത്തെ വിൽപ്പന: {count} വിൽപ്പന, ആകെ ₹{revenue}, ലാഭം ₹{profit}.",
        "mr": "आजची विक्री: {count} विक्री, एकूण ₹{revenue}, नफा ₹{profit}.",
        "bn": "আজকের বিক্রি: {count} বিক্রি, মোট ₹{revenue}, লাভ ₹{profit}.",
        "gu": "આજનું વેચાણ: {count} વેચાણ, કુલ ₹{revenue}, નફો ₹{profit}.",
        "pa": "ਅੱਜ ਦੀ ਵਿਕਰੀ: {count} ਵਿਕਰੀ, ਕੁੱਲ ₹{revenue}, ਮੁਨਾਫ਼ਾ ₹{profit}.",
    },
    "profit_only": {
        "en": "Your profit today is ₹{profit}, from ₹{revenue} in sales.",
        "kn": "ಇಂದಿನ ಲಾಭ ₹{profit}, ಮಾರಾಟ ₹{revenue}.",
        "hi": "आज का मुनाफा ₹{profit} है, बिक्री ₹{revenue}.",
        "te": "ఈరోజు లాభం ₹{profit}, అమ్మకాలు ₹{revenue}.",
        "ta": "இன்றைய லாபம் ₹{profit}, விற்பனை ₹{revenue}.",
        "ml": "ഇന്നത്തെ ലാഭം ₹{profit}, വിൽപ്പന ₹{revenue}.",
        "mr": "आजचा नफा ₹{profit}, विक्री ₹{revenue}.",
        "bn": "আজকের লাভ ₹{profit}, বিক্রি ₹{revenue}.",
        "gu": "આજનો નફો ₹{profit}, વેચાણ ₹{revenue}.",
        "pa": "ਅੱਜ ਦਾ ਮੁਨਾਫ਼ਾ ₹{profit}, ਵਿਕਰੀ ₹{revenue}.",
    },
    "stock_one": {
        "en": "You have {stock} {unit} of {product} right now.",
        "kn": "ನಿಮ್ಮ ಬಳಿ ಈಗ {stock} {unit} {product} ಇದೆ.",
        "hi": "आपके पास अभी {stock} {unit} {product} है.",
        "te": "మీ వద్ద ఇప్పుడు {stock} {unit} {product} ఉంది.",
        "ta": "உங்களிடம் இப்போது {stock} {unit} {product} உள்ளது.",
        "ml": "നിങ്ങളുടെ കൈയിൽ ഇപ്പോൾ {stock} {unit} {product} ഉണ്ട്.",
        "mr": "तुमच्याकडे आता {stock} {unit} {product} आहे.",
        "bn": "আপনার কাছে এখন {stock} {unit} {product} আছে।",
        "gu": "તમારી પાસે હવે {stock} {unit} {product} છે.",
        "pa": "ਤੁਹਾਡੇ ਕੋਲ ਹੁਣ {stock} {unit} {product} ਹੈ।",
    },
    "stock_low": {
        "en": "You have {stock} {unit} of {product} — that's running low.",
        "kn": "ನಿಮ್ಮ ಬಳಿ {stock} {unit} {product} ಮಾತ್ರ ಇದೆ — ಕಡಿಮೆಯಾಗುತ್ತಿದೆ.",
        "hi": "आपके पास {stock} {unit} {product} है — कम पड़ रहा है।",
        "te": "మీ వద్ద {stock} {unit} {product} ఉంది — తక్కువగా ఉంది.",
        "ta": "உங்களிடம் {stock} {unit} {product} உள்ளது — குறைந்து வருகிறது.",
        "ml": "നിങ്ങളുടെ കൈയിൽ {stock} {unit} {product} ഉണ്ട് — കുറവാണ്.",
        "mr": "तुमच्याकडे {stock} {unit} {product} आहे — कमी होत आहे.",
        "bn": "আপনার কাছে {stock} {unit} {product} আছে — কম হচ্ছে।",
        "gu": "તમારી પાસે {stock} {unit} {product} છે — ઓછું થઈ રહ્યું છે.",
        "pa": "ਤੁਹਾਡੇ ਕੋਲ {stock} {unit} {product} ਹੈ — ਘੱਟ ਹੋ ਰਿਹਾ ਹੈ।",
    },
    "stock_none": {
        "en": "I couldn't find {product} in your catalog. You have these: {items}",
        "kn": "{product} ನಿಮ್ಮ ಪಟ್ಟಿಯಲ್ಲಿ ಸಿಗಲಿಲ್ಲ. ನಿಮ್ಮ ಐಟಂಗಳು: {items}",
        "hi": "{product} आपकी सूची में नहीं मिला। आपके पास ये हैं: {items}",
        "te": "{product} మీ జాబితాలో లేదు. మీ వస్తువులు: {items}",
        "ta": "{product} உங்கள் பட்டியலில் இல்லை. உங்கள் பொருட்கள்: {items}",
        "ml": "{product} നിങ്ങളുടെ പട്ടികയിൽ ഇല്ല. നിങ്ങളുടെ ഇനങ്ങൾ: {items}",
        "mr": "{product} तुमच्या यादीत नाही. तुमचे वस्तू: {items}",
        "bn": "{product} আপনার তালিকায় নেই। আপনার আইটেম: {items}",
        "gu": "{product} તમારી યાદીમાં નથી. તમારી વસ્તુઓ: {items}",
        "pa": "{product} ਤੁਹਾਡੀ ਸੂਚੀ ਵਿੱਚ ਨਹੀਂ ਹੈ। ਤੁਹਾਡੀਆਂ ਚੀਜ਼ਾਂ: {items}",
    },
    "stock_all": {
        "en": "You have {count} products. Top items: {items}",
        "kn": "ನಿಮ್ಮ ಬಳಿ {count} ಐಟಂಗಳಿವೆ. ಮುಖ್ಯವಾಗಿ: {items}",
        "hi": "आपके पास {count} उत्पाद हैं। मुख्य: {items}",
        "te": "మీ వద్ద {count} వస్తువులు ఉన్నాయి. ముఖ్యమైనవి: {items}",
        "ta": "உங்களிடம் {count} பொருட்கள் உள்ளன. முக்கியமானவை: {items}",
        "ml": "നിങ്ങളുടെ കൈയിൽ {count} ഇനങ്ങൾ ഉണ്ട്. പ്രധാനം: {items}",
        "mr": "तुमच्याकडे {count} वस्तू आहेत. मुख्य: {items}",
        "bn": "আপনার কাছে {count}টি আইটেম আছে। প্রধান: {items}",
        "gu": "તમારી પાસે {count} વસ્તુઓ છે. મુખ્ય: {items}",
        "pa": "ਤੁਹਾਡੇ ਕੋਲ {count} ਚੀਜ਼ਾਂ ਹਨ। ਮੁੱਖ: {items}",
    },
    "orders": {
        "en": "You have {count} active orders.",
        "kn": "ನಿಮ್ಮಲ್ಲಿ {count} ಸಕ್ರಿಯ ಆರ್ಡರ್‌ಗಳಿವೆ.",
        "hi": "आपके पास {count} सक्रिय ऑर्डर हैं।",
        "te": "మీ వద్ద {count} యాక్టివ్ ఆర్డర్లు ఉన్నాయి.",
        "ta": "உங்களிடம் {count} சுறுசுறுப்பான ஆர்டர்கள் உள்ளன.",
        "ml": "നിങ്ങളുടെ കൈയിൽ {count} ഓർഡറുകൾ ഉണ്ട്.",
        "mr": "तुमच्याकडे {count} सक्रिय ऑर्डर आहेत.",
        "bn": "আপনার {count}টি সক্রিয় অর্ডার আছে।",
        "gu": "તમારી પાસે {count} સક્રિય ઓર્ડર છે.",
        "pa": "ਤੁਹਾਡੇ ਕੋਲ {count} ਸਰਗਰਮ ਆਰਡਰ ਹਨ।",
    },
    "orders_detail": {
        "en": "Latest: {detail}.",
        "kn": "ಇತ್ತೀಚಿನದು: {detail}.",
        "hi": "नवीनतम: {detail}.",
        "te": "ఇటీవలిది: {detail}.",
        "ta": "சமீபத்தியது: {detail}.",
        "ml": "ഏറ്റവും പുതിയത്: {detail}.",
        "mr": "अलीकडील: {detail}.",
        "bn": "সর্বশেষ: {detail}।",
        "gu": "તાજેતરનું: {detail}.",
        "pa": "ਸਭ ਤੋਂ ਨਵਾਂ: {detail}.",
    },
    "orders_none": {
        "en": "No active orders right now.",
        "kn": "ಈಗ ಯಾವುದೇ ಸಕ್ರಿಯ ಆರ್ಡರ್ ಇಲ್ಲ.",
        "hi": "अभी कोई सक्रिय ऑर्डर नहीं है।",
        "te": "ప్రస్తుతం యాక్టివ్ ఆర్డర్లు లేవు.",
        "ta": "இப்போது சுறுசுறுப்பான ஆர்டர்கள் இல்லை.",
        "ml": "ഇപ്പോൾ ഓർഡറുകൾ ഇല്ല.",
        "mr": "सध्या कोणतेही सक्रिय ऑर्डर नाहीत.",
        "bn": "এখন কোনো সক্রিয় অর্ডার নেই।",
        "gu": "હાલમાં કોઈ સક્રિય ઓર્ડર નથી.",
        "pa": "ਹੁਣ ਕੋਈ ਸਰਗਰਮ ਆਰਡਰ ਨਹੀਂ ਹੈ।",
    },
    "udhaar_total": {
        "en": "{count} customers owe you ₹{total} in total.",
        "kn": "{count} ಗ್ರಾಹಕರು ಒಟ್ಟು ₹{total} ಕೊಟ್ಟಿರಬೇಕಿದೆ.",
        "hi": "{count} ग्राहकों से आपको कुल ₹{total} मिलने हैं।",
        "te": "{count} కస్టమర్ల నుండి మొత్తం ₹{total} రావాలి.",
        "ta": "{count} வாடிக்கையாளர்களிடம் மொத்தம் ₹{total} பாக்கி.",
        "ml": "{count} ഉപഭോക്താക്കൾക്ക് ആകെ ₹{total} ബാക്കി.",
        "mr": "{count} ग्राहकांकडून एकूण ₹{total} बाकी.",
        "bn": "{count} জন ক্রেতার কাছে মোট ₹{total} বাকি।",
        "gu": "{count} ગ્રાહકો પાસેથી કુલ ₹{total} બાકી.",
        "pa": "{count} ਗਾਹਕਾਂ ਤੋਂ ਕੁੱਲ ₹{total} ਬਾਕੀ ਹੈ।",
    },
    "udhaar_one": {
        "en": "{name} owes you ₹{amount}.",
        "kn": "{name} ಅವರು ₹{amount} ಕೊಡಬೇಕಿದೆ.",
        "hi": "{name} से ₹{amount} बाकी है।",
        "te": "{name}కి ₹{amount} బాకీ.",
        "ta": "{name}டம் ₹{amount} பாக்கி.",
        "ml": "{name}ന് ₹{amount} ബാക്കി.",
        "mr": "{name} ला ₹{amount} बाकी.",
        "bn": "{name} এর কাছে ₹{amount} বাকি।",
        "gu": "{name} પાસે ₹{amount} બાકી.",
        "pa": "{name} ਤੋਂ ₹{amount} ਬਾਕੀ ਹੈ।",
    },
    "udhaar_none": {
        "en": "Nobody owes you anything right now. All clear!",
        "kn": "ಈಗ ಯಾರೂ ಹಣ ಕೊಡಬೇಕಿಲ್ಲ. ಎಲ್ಲವೂ ಸ್ಪಷ್ಟ!",
        "hi": "अभी किसी से कुछ बाकी नहीं है। सब साफ़ है!",
        "te": "ప్రస్తుతం ఎవరికీ బాకీ లేదు.",
        "ta": "இப்போது யாருக்கும் பாக்கி இல்லை.",
        "ml": "ഇപ്പോൾ ആരുടെയും കടം ഇല്ല.",
        "mr": "सध्या कोणाचेही बाकी नाही.",
        "bn": "এখন কারও কাছে কিছু বাকি নেই।",
        "gu": "હાલમાં કોઈનું બાકી નથી.",
        "pa": "ਹੁਣ ਕਿਸੇ ਤੋਂ ਕੁਝ ਬਾਕੀ ਨਹੀਂ ਹੈ।",
    },
    "confirm_stock": {
        "en": "Should I {direction} {qty} {unit} of {product}?",
        "kn": "{qty} {unit} {product} {direction_kn} ಮಾಡಲಾ?",
        "hi": "क्या मैं {qty} {unit} {product} {direction_hi} करूँ?",
        "te": "{qty} {unit} {product} {direction_te} చేయాలా?",
        "ta": "{qty} {unit} {product} {direction_ta} செய்யவா?",
        "ml": "{qty} {unit} {product} {direction_ml} ചെയ്യട്ടെ?",
        "mr": "{qty} {unit} {product} {direction_mr} करू का?",
        "bn": "কি {qty} {unit} {product} {direction_bn} করব?",
        "gu": "શું {qty} {unit} {product} {direction_gu} કરું?",
        "pa": "ਕੀ {qty} {unit} {product} {direction_pa} ਕਰਾਂ?",
    },
    "confirm_order": {
        "en": "Should I place an order for {qty} {unit} of {product}?",
        "kn": "{qty} {unit} {product} ಆರ್ಡರ್ ಮಾಡಲಾ?",
        "hi": "क्या {qty} {unit} {product} का ऑर्डर करूँ?",
        "te": "{qty} {unit} {product} ఆర్డర్ చేయాలా?",
        "ta": "{qty} {unit} {product} ஆர்டர் செய்யவா?",
        "ml": "{qty} {unit} {product} ഓർഡർ ചെയ്യട്ടെ?",
        "mr": "{qty} {unit} {product} चा ऑर्डर करू का?",
        "bn": "কি {qty} {unit} {product} অর্ডার করব?",
        "gu": "શું {qty} {unit} {product} નો ઓર્ડર કરું?",
        "pa": "ਕੀ {qty} {unit} {product} ਦਾ ਆਰਡਰ ਕਰਾਂ?",
    },
    "confirm_udhaar": {
        "en": "Should I add ₹{amount} udhaar for {name}?",
        "kn": "{name} ಅವರಿಗೆ ₹{amount} ಉದಾರ ಸೇರಿಸಲಾ?",
        "hi": "क्या {name} के लिए ₹{amount} उधार जोड़ूँ?",
        "te": "{name} కి ₹{amount} ఉధార్ జోడించాలా?",
        "ta": "{name}க்கு ₹{amount} கடன் சேர்க்கவா?",
        "ml": "{name}ന് ₹{amount} കടം ചേർക്കട്ടെ?",
        "mr": "{name} साठी ₹{amount} उधार जोडू का?",
        "bn": "কি {name} এর জন্য ₹{amount} বাকি যোগ করব?",
        "gu": "શું {name} માટે ₹{amount} ઉધાર ઉમેરું?",
        "pa": "ਕੀ {name} ਲਈ ₹{amount} ਉਧਾਰ ਜੋੜਾਂ?",
    },
    "confirm_payment": {
        "en": "Should I record a ₹{amount} payment from {name}?",
        "kn": "{name} ಅವರಿಂದ ₹{amount} ಪಾವತಿ ದಾಖಲಿಸಲಾ?",
        "hi": "क्या {name} से ₹{amount} की पेमेंट दर्ज करूँ?",
        "te": "{name} నుండి ₹{amount} చెల్లింపు నమోదు చేయాలా?",
        "ta": "{name}டமிருந்து ₹{amount} பணம் பதிவு செய்யவா?",
        "ml": "{name}ൽ നിന്ന് ₹{amount} പണം രേഖപ്പെടുത്തട്ടെ?",
        "mr": "{name} कडून ₹{amount} पेमेंट नोंदवू का?",
        "bn": "কি {name} থেকে ₹{amount} পেমেন্ট রেকর্ড করব?",
        "gu": "શું {name} પાસેથી ₹{amount} ચુકવણી નોંધું?",
        "pa": "ਕੀ {name} ਤੋਂ ₹{amount} ਦੀ ਪੇਮੈਂਟ ਦਰਜ ਕਰਾਂ?",
    },
    "done_stock": {
        "en": "Done. {product} is now {stock} {unit}.",
        "kn": "ಆಯಿತು. ಈಗ {product} {stock} {unit} ಇದೆ.",
        "hi": "हो गया। अब {product} {stock} {unit} है।",
        "te": "అయింది. ఇప్పుడు {product} {stock} {unit} ఉంది.",
        "ta": "முடிந்தது. இப்போது {product} {stock} {unit} உள்ளது.",
        "ml": "കഴിഞ്ഞു. ഇപ്പോൾ {product} {stock} {unit} ഉണ്ട്.",
        "mr": "झाले. आता {product} {stock} {unit} आहे.",
        "bn": "হয়ে গেছে। এখন {product} {stock} {unit} আছে।",
        "gu": "થઈ ગયું. હવે {product} {stock} {unit} છે.",
        "pa": "ਹੋ ਗਿਆ। ਹੁਣ {product} {stock} {unit} ਹੈ।",
    },
    "done_order": {
        "en": "Done. Order {order} placed for {product}.",
        "kn": "ಆಯಿತು. {product} ಗೆ ಆರ್ಡರ್ {order} ಆಗಿದೆ.",
        "hi": "हो गया। {product} का ऑर्डर {order} हो गया।",
        "te": "అయింది. {product} ఆర్డర్ {order} అయింది.",
        "ta": "முடிந்தது. {product} ஆர்டர் {order} ஆனது.",
        "ml": "കഴിഞ്ഞു. {product} ഓർഡർ {order} ആയി.",
        "mr": "झाले. {product} साठी ऑर्डर {order} झाला.",
        "bn": "হয়ে গেছে। {product} এর অর্ডার {order} হয়েছে।",
        "gu": "થઈ ગયું. {product} નો ઓર્ડર {order} થયો.",
        "pa": "ਹੋ ਗਿਆ। {product} ਦਾ ਆਰਡਰ {order} ਹੋ ਗਿਆ।",
    },
    "done_udhaar": {
        "en": "Done. ₹{amount} udhaar added for {name}.",
        "kn": "ಆಯಿತು. {name} ಗೆ ₹{amount} ಉದಾರ ಸೇರಿಸಲಾಗಿದೆ.",
        "hi": "हो गया। {name} के लिए ₹{amount} उधार जोड़ दिया।",
        "te": "అయింది. {name} కి ₹{amount} ఉధార్ జోడించాం.",
        "ta": "முடிந்தது. {name}க்கு ₹{amount} கடன் சேர்க்கப்பட்டது.",
        "ml": "കഴിഞ്ഞു. {name}ന് ₹{amount} കടം ചേർത്തു.",
        "mr": "झाले. {name} साठी ₹{amount} उधार जोडले.",
        "bn": "হয়ে গেছে। {name} এর জন্য ₹{amount} বাকি যোগ হলো।",
        "gu": "થઈ ગયું. {name} માટે ₹{amount} ઉધાર ઉમેર્યું.",
        "pa": "ਹੋ ਗਿਆ। {name} ਲਈ ₹{amount} ਉਧਾਰ ਜੋੜ ਦਿੱਤਾ।",
    },
    "done_payment": {
        "en": "Done. ₹{paid} recorded from {name}. ₹{remaining} still due.",
        "kn": "ಆಯಿತು. {name} ಅವರಿಂದ ₹{paid} ದಾಖಲಾಗಿದೆ. ಉಳಿದಿದೆ ₹{remaining}.",
        "hi": "हो गया। {name} से ₹{paid} दर्ज हुआ। अब ₹{remaining} बाकी।",
        "te": "అయింది. {name} నుండి ₹{paid} నమోదైంది. ఇంకా ₹{remaining} బాకీ.",
        "ta": "முடிந்தது. {name}டமிருந்து ₹{paid} பதிவு. இன்னும் ₹{remaining} பாக்கி.",
        "ml": "കഴിഞ്ഞു. {name}ൽ നിന്ന് ₹{paid} രേഖപ്പെടുത്തി. ഇനി ₹{remaining} ബാക്കി.",
        "mr": "झाले. {name} कडून ₹{paid} नोंदवले. ₹{remaining} बाकी.",
        "bn": "হয়ে গেছে। {name} থেকে ₹{paid} রেকর্ড হলো। এখনো ₹{remaining} বাকি।",
        "gu": "થઈ ગયું. {name} પાસેથી ₹{paid} નોંધાયું. હવે ₹{remaining} બાકી.",
        "pa": "ਹੋ ਗਿਆ। {name} ਤੋਂ ₹{paid} ਦਰਜ ਹੋਇਆ। ਹੁਣੇ ₹{remaining} ਬਾਕੀ।",
    },
    "weather": {
        "en": "Weather now: {condition}, {temp} degrees. {advisory}",
        "kn": "ಈಗ ಹವಾಮಾನ: {condition}, {temp} ಡಿಗ್ರಿ. {advisory}",
        "hi": "अभी मौसम: {condition}, {temp} डिग्री। {advisory}",
        "te": "ఇప్పుడు వాతావరణం: {condition}, {temp} డిగ్రీలు. {advisory}",
        "ta": "இப்போதைய வானிலை: {condition}, {temp} டிகிரி. {advisory}",
        "ml": "ഇപ്പോഴത്തെ കാലാവസ്ഥ: {condition}, {temp} ഡിഗ്രി. {advisory}",
        "mr": "आताचे हवामान: {condition}, {temp} अंश. {advisory}",
        "bn": "এখনকার আবহাওয়া: {condition}, {temp} ডিগ্রি। {advisory}",
        "gu": "હાલનું હવામાન: {condition}, {temp} ડિગ્રી. {advisory}",
        "pa": "ਹੁਣ ਦਾ ਮੌਸਮ: {condition}, {temp} ਡਿਗਰੀ। {advisory}",
    },
    "location": {
        "en": "Best spot today: {location} (score {score}/100).",
        "kn": "ಇಂದಿನ ಉತ್ತಮ ಸ್ಥಳ: {location} (ಸ್ಕೋರ್ {score}/100).",
        "hi": "आज की सबसे अच्छी जगह: {location} (स्कोर {score}/100)।",
        "te": "ఈరోజు మంచి ప్రదేశం: {location} (స్కోరు {score}/100).",
        "ta": "இன்றைய சிறந்த இடம்: {location} (மதிப்பெண் {score}/100).",
        "ml": "ഇന്നത്തെ മികച്ച സ്ഥലം: {location} (സ്കോർ {score}/100).",
        "mr": "आजची उत्तम जागा: {location} (स्कोअर {score}/100).",
        "bn": "আজকের সেরা জায়গা: {location} (স্কোর {score}/100)।",
        "gu": "આજની શ્રેષ્ઠ જગ્યા: {location} (સ્કોર {score}/100).",
        "pa": "ਅੱਜ ਦੀ ਵਧੀਆ ਥਾਂ: {location} (ਸਕੋਰ {score}/100)।",
    },
    "market_price": {
        "en": "Market price of {product}: ₹{price} per kg.",
        "kn": "{product} ನ ಮಾರುಕಟ್ಟೆ ಬೆಲೆ: ಕೆಜಿಗೆ ₹{price}.",
        "hi": "{product} का बाज़ार भाव: ₹{price} प्रति किलो.",
        "te": "{product} మార్కెట్ ధర: కిలోకి ₹{price}.",
        "ta": "{product} சந்தை விலை: கிலோக்கு ₹{price}.",
        "ml": "{product} മാർക്കറ്റ് വില: കിലോയ്ക്ക് ₹{price}.",
        "mr": "{product} चा बाजारभाव: ₹{price} प्रति किलो.",
        "bn": "{product} এর বাজার দাম: ₹{price} প্রতি কেজি।",
        "gu": "{product} નો બજાર ભાવ: ₹{price} પ્રતિ કિલો.",
        "pa": "{product} ਦਾ ਬਾਜ਼ਾਰ ਭਾਅ: ₹{price} ਪ੍ਰਤੀ ਕਿਲੋ।",
    },
    "top_products": {
        "en": "In the last {days} days, your fastest movers were: {items}. Carrying a bit more of these could help.",
        "kn": "ಕಳೆದ {days} ದಿನಗಳಲ್ಲಿ ಹೆಚ್ಚು ಬಿಕರಿಯಾದವು: {items}. ಇವುಗಳನ್ನು ಸ್ವಲ್ಪ ಹೆಚ್ಚು ತೆಗೆದುಕೊಂಡರೆ ಒಳ್ಳೆಯದು.",
        "hi": "पिछले {days} दिनों में सबसे ज़्यादा बिकने वाले: {items}। इन्हें थोड़ा ज़्यादा रखें तो अच्छा रहेगा।",
        "te": "గత {days} రోజుల్లో బాగా అమ్ముడైనవి: {items}. వీటిని కొంచెం ఎక్కువ పెట్టుకోవచ్చు.",
        "ta": "கடந்த {days} நாட்களில் அதிகம் விற்றவை: {items}. இவற்றை கொஞ்சம் அதிகமாக எடுத்துச் செல்லலாம்.",
        "ml": "കഴിഞ്ഞ {days} ദിവസങ്ങളിൽ കൂടുതൽ വിറ്റത്: {items}. ഇവ കുറച്ചു കൂടി കൊള്ളാം.",
        "mr": "गेल्या {days} दिवसांत जास्त विकली गेलेली: {items}. या थोड्या जास्त न्याव्यात.",
        "bn": "গত {days} দিনে বেশি বিক্রি হয়েছে: {items}। এগুলো একটু বেশি রাখা ভালো।",
        "gu": "છેલ્લા {days} દિવસમાં વધુ વેચાયેલા: {items}. આ થોડા વધુ રાખવા સારું.",
        "pa": "ਪਿਛਲੇ {days} ਦਿਨਾਂ ਵਿੱਚ ਸਭ ਤੋਂ ਵੱਧ ਵਿੱਕੇ: {items}. ਇਹ ਥੋੜ੍ਹਾ ਵੱਧ ਰੱਖੋ।",
    },
    "no_sales_data": {
        "en": "No sales recorded yet today.",
        "kn": "ಇಂದು ಇನ್ನೂ ಮಾರಾಟವಾಗಿಲ್ಲ.",
        "hi": "आज अभी कोई बिक्री दर्ज नहीं हुई है।",
        "te": "ఈరోజు ఇంకా అమ్మకాలు లేవు.",
        "ta": "இன்று இன்னும் விற்பனை இல்லை.",
        "ml": "ഇന്ന് ഇതുവരെ വിൽപ്പന ഇല്ല.",
        "mr": "आज अजून विक्री नाही.",
        "bn": "আজ এখনো কোনো বিক্রি হয়নি।",
        "gu": "આજે હજુ વેચાણ નથી.",
        "pa": "ਅੱਜ ਹਾਲੇ ਕੋਈ ਵਿਕਰੀ ਨਹੀਂ ਹੋਈ।",
    },
    "clarify_sales_profit": {
        "en": "Do you mean total sales, or your profit?",
        "kn": "ನೀವು ಒಟ್ಟು ಮಾರಾಟ ಕೇಳುತ್ತಿದ್ದೀರಾ ಅಥವಾ ಲಾಭ?",
        "hi": "आप कुल बिक्री पूछ रहे हैं या मुनाफा?",
        "te": "మొత్తం అమ్మకాలు అడుగుతున్నారా, లేదా లాభం?",
        "ta": "மொத்த விற்பனை கேட்கிறீர்களா, அல்லது லாபமா?",
        "ml": "ആകെ വിൽപ്പന ആണോ, അതോ ലാഭമോ?",
        "mr": "तुम्ही एकूण विक्री विचारताय की नफा?",
        "bn": "আপনি মোট বিক্রি বোঝাচ্ছেন, নাকি লাভ?",
        "gu": "તમે કુલ વેચાણ પૂછો છો, કે નફો?",
        "pa": "ਤੁਸੀਂ ਕੁੱਲ ਵਿਕਰੀ ਪੁੱਛ ਰਹੇ ਹੋ, ਜਾਂ ਮੁਨਾਫ਼ਾ?",
    },
    "action_success": {
        "en": "Done.",
        "kn": "ಆಯಿತು.",
        "hi": "हो गया।",
        "te": "అయింది.",
        "ta": "முடிந்தது.",
        "ml": "കഴിഞ്ഞു.",
        "mr": "झाले.",
        "bn": "হয়ে গেছে।",
        "gu": "થઈ ગયું.",
        "pa": "ਹੋ ਗਿਆ।",
    },
    "action_failed": {
        "en": "Sorry, I couldn't do that: {reason}",
        "kn": "ಕ್ಷಮಿಸಿ, ಅದು ಆಗಲಿಲ್ಲ: {reason}",
        "hi": "माफ़ करें, वह नहीं हो सका: {reason}",
        "te": "క్షమించండి, అది జరగలేదు: {reason}",
        "ta": "மன்னிக்கவும், அது நடக்கவில்லை: {reason}",
        "ml": "ക്ഷമിക്കണം, അത് ആയില്ല: {reason}",
        "mr": "क्षमस्व, ते झाले नाही: {reason}",
        "bn": "দুঃখিত, সেটা হয়নি: {reason}",
        "gu": "માફ કરો, એ થઈ શક્યું નહીં: {reason}",
        "pa": "ਮਾਫ਼ ਕਰਨਾ, ਉਹ ਨਹੀਂ ਹੋਇਆ: {reason}",
    },
    "data_unavailable": {
        "en": "I can't reach your {what} data right now.",
        "kn": "ನಿಮ್ಮ {what} ಮಾಹಿತಿ ಈಗ ಸಿಗುತ್ತಿಲ್ಲ.",
        "hi": "आपका {what} डेटा अभी उपलब्ध नहीं है।",
        "te": "మీ {what} డేటా ఇప్పుడు అందుబాటులో లేదు.",
        "ta": "உங்கள் {what} தரவு இப்போது கிடைக்கவில்லை.",
        "ml": "നിങ്ങളുടെ {what} ഡാറ്റ ഇപ്പോൾ ലഭ്യമല്ല.",
        "mr": "तुमचा {what} डेटा सध्या उपलब्ध नाही.",
        "bn": "আপনার {what} ডেটা এখন পাওয়া যাচ্ছে না।",
        "gu": "તમારો {what} ડેટા હાલ ઉપલબ્ધ નથી.",
        "pa": "ਤੁਹਾਡਾ {what} ਡਾਟਾ ਹੁਣ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।",
    },
    "cancelled": {
        "en": "Okay, cancelled.",
        "kn": "ಸರಿ, ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ.",
        "hi": "ठीक है, रद्द कर दिया।",
        "te": "సరే, రద్దు చేశాను.",
        "ta": "சரி, ரத்து செய்தேன்.",
        "ml": "ശരി, റദ്ദാക്കി.",
        "mr": "ठीक, रद्द केले.",
        "bn": "ঠিক আছে, বাতিল করেছি।",
        "gu": "ઠીક, રદ કર્યું.",
        "pa": "ਠੀਕ ਹੈ, ਰੱਦ ਕਰ ਦਿੱਤਾ।",
    },
    "insufficient_stock": {
        "en": "Not enough stock of {product} — only {stock} left.",
        "kn": "{product} ಸಾಕಷ್ಟಿಲ್ಲ — {stock} ಮಾತ್ರ ಉಳಿದಿದೆ.",
        "hi": "{product} उतना नहीं है — सिर्फ {stock} बचा है।",
        "te": "{product} సరిపోదు — {stock} మాత్రమే ఉంది.",
        "ta": "{product} போதாது — {stock} மட்டும் உள்ளது.",
        "ml": "{product} പോരാ — {stock} മാത്രം ബാക്കി.",
        "mr": "{product} पुरेसे नाहीत — फक्त {stock} शिल्लक.",
        "bn": "{product} যথেষ্ট নেই — মাত্র {stock} বাকি।",
        "gu": "{product} પૂરતું નથી — ફક્ત {stock} બાકી.",
        "pa": "{product} ਲੋੜੀਂਦਾ ਨਹੀਂ — ਸਿਰਫ਼ {stock} ਬਚਿਆ ਹੈ।",
    },
}

DIRECTION_WORDS = {
    "add": {"en": "add", "kn": "ಸೇರಿಸುವುದಾ", "hi": "जोड़ूँ", "te": "జోడించ", "ta": "சேர்க்க", "ml": "ചേർക്ക", "mr": "जोडू", "bn": "যোগ", "gu": "ઉમેરું", "pa": "ਜੋੜਾਂ"},
    "reduce": {"en": "reduce", "kn": "ಕಡಿಮೆ ಮಾಡುವುದಾ", "hi": "घटाऊँ", "te": "తగ్గించ", "ta": "குறைக்க", "ml": "കുറയ്ക്ക", "mr": "कमी करू", "bn": "কমাব", "gu": "ઘટાડું", "pa": "ਘਟਾਵਾਂ"},
}


# Localized display names for common products (used in spoken confirmations)
PRODUCT_NAMES = {
    "tomato": {"en": "tomato", "kn": "ಟೊಮೇಟೊ", "hi": "टमाटर", "ta": "தக்காளி", "te": "టమోటా", "ml": "തക്കാളി", "mr": "टोमॅटो", "bn": "টমেটো", "gu": "ટામેટાં", "pa": "ਟਮਾਟਰ"},
    "onion": {"en": "onion", "kn": "ಈರುಳ್ಳಿ", "hi": "प्याज", "ta": "வெங்காயம்", "te": "ఉల్లిపాయ", "ml": "ഉള്ളി", "mr": "कांदा", "bn": "পেঁয়াজ", "gu": "ડુંગળી", "pa": "ਪਿਆਜ਼"},
    "potato": {"en": "potato", "kn": "ಆಲೂಗಡ್ಡೆ", "hi": "आलू", "ta": "உருளைக்கிழங்கு", "te": "బంగాళాదుంప", "ml": "ഉരുളക്കിഴങ്ങ്", "mr": "बटाटा", "bn": "আলু", "gu": "બટાટા", "pa": "ਆਲੂ"},
    "rice": {"en": "rice", "kn": "ಅಕ್ಕಿ", "hi": "चावल", "ta": "அரிசி", "te": "బియ్యం", "ml": "അരി", "mr": "तांदळ", "bn": "চাল", "gu": "ચોખા", "pa": "ਚਾਵਲ"},
    "turmeric": {"en": "turmeric", "kn": "ಅರಿಶಿನ", "hi": "हल्दी", "ta": "மஞ்சள்", "te": "పసుపు", "ml": "മഞ്ഞൾ", "mr": "हळद", "bn": "হলুদ", "gu": "હળદર", "pa": "ਹਲਦੀ"},
    "chilli": {"en": "chilli", "kn": "ಮೆಣಸಿನಕಾಯಿ", "hi": "मिर्च", "ta": "மிளகாய்", "te": "మిర్చి", "ml": "മുളക്", "mr": "मिरची", "bn": "লঙ্কা", "gu": "મરચી", "pa": "ਮਿਰਚ"},
    "dal": {"en": "dal", "kn": "ಬೇಳೆ", "hi": "दाल", "ta": "பருப்பு", "te": "పప్పు", "ml": "പരിപ്പ്", "mr": "डाळ", "bn": "ডাল", "gu": "દાળ", "pa": "ਦਾਲ"},
    "milk": {"en": "milk", "kn": "ಹಾಲು", "hi": "दूध", "ta": "பால்", "te": "పాలు", "ml": "പാൽ", "mr": "दूध", "bn": "দুধ", "gu": "દૂધ", "pa": "ਦੁੱਧ"},
    "eggs": {"en": "eggs", "kn": "ಮೊಟ್ಟೆ", "hi": "अंडा", "ta": "முட்டை", "te": "గుడ్డ", "ml": "മുട്ട", "mr": "अंडी", "bn": "ডিম", "gu": "ઈંડા", "pa": "ਅੰਡੇ"},
    "sugar": {"en": "sugar", "kn": "ಸಕ್ಕರೆ", "hi": "चीनी", "ta": "சர்க்கரை", "te": "చక్కెర", "ml": "പഞ്ചസാര", "mr": "साखर", "bn": "চিনি", "gu": "ખાંડ", "pa": "ਖੰਡ"},
    "oil": {"en": "oil", "kn": "ಎಣ್ಣೆ", "hi": "तेल", "ta": "எண்ணெய்", "te": "నూనె", "ml": "എണ്ണ", "mr": "तेल", "bn": "তেল", "gu": "તેલ", "pa": "ਤੇਲ"},
    "carrot": {"en": "carrot", "kn": "ಕ್ಯಾರೆಟ್", "hi": "गाजर", "ta": "கேரட்", "te": "క్యారెట్", "ml": "കാരറ്റ്", "mr": "गाजर", "bn": "গাজর", "gu": "કેરેટ", "pa": "ਗਾਜਰ"},
    "cucumber": {"en": "cucumber", "kn": "ಸೌತೆಕಾಯಿ", "hi": "खीरा", "ta": "வெள்ளரி", "te": "దోస", "ml": "വെള്ളരി", "mr": "काकडी", "bn": "শশা", "gu": "કાકડી", "pa": "ਖੀਰਾ"},
}


def product_display(name: str, lang: str) -> str:
    """Best-effort localized product name for speech (falls back to given name)."""
    low = (name or "").lower()
    for key, names in PRODUCT_NAMES.items():
        if key in low:
            return names.get(lang) or names["en"]
    return name


UNIT_NAMES = {
    "kg": {"en": "kg", "kn": "ಕೆಜಿ", "hi": "किलो", "ta": "கிலோ", "te": "కిలో", "ml": "കിലോ", "mr": "किलो", "bn": "কেজি", "gu": "કિલો", "pa": "ਕਿਲੋ"},
    "g": {"en": "gram", "kn": "ಗ್ರಾಂ", "hi": "ग्राम", "ta": "கிராம்", "te": "గ్రాము", "ml": "ഗ്രാം", "mr": "ग्राम", "bn": "গ্রাম", "gu": "ગ્રામ", "pa": "ਗ੍ਰਾਮ"},
    "packet": {"en": "packet", "kn": "ಪೊಟ್ಟಣ", "hi": "पैकेट", "ta": "பாக்கெட்", "te": "ప్యాకెట్", "ml": "പാക്കറ്റ്", "mr": "पॅकेट", "bn": "প্যাকেট", "gu": "પેકેટ", "pa": "ਪੈਕੇਟ"},
    "liter": {"en": "liter", "kn": "ಲೀಟರ್", "hi": "लीटर", "ta": "லிட்டர்", "te": "లీటర్", "ml": "ലിറ്റർ", "mr": "लिटर", "bn": "লিটার", "gu": "લિટર", "pa": "ਲੀਟਰ"},
    "bunch": {"en": "bunch", "kn": "ಕಟ್ಟು", "hi": "गट्ठा", "ta": "கட்டு", "te": "కట్ట", "ml": "കെട്ട്", "mr": "गठ्ठा", "bn": "আঁটি", "gu": "ગથ્થો", "pa": "ਗੱਠਾ"},
    "piece": {"en": "piece", "kn": "ತುಂಡು", "hi": "पीस", "ta": "துண்டு", "te": "ముక్క", "ml": "കഷണം", "mr": "तुकडा", "bn": "টুকরো", "gu": "ખાನું", "pa": "ਟੁਕੜਾ"},
    "dozen": {"en": "dozen", "kn": "ಡಜನ್", "hi": "दर्जन", "ta": "டசன்", "te": "డజను", "ml": "ഡസൻ", "mr": "डझन", "bn": "ডজন", "gu": "ડઝન", "pa": "ਦਰਜਨ"},
}


def unit_display(unit: str, lang: str) -> str:
    return UNIT_NAMES.get(unit, {}).get(lang) or unit


def say(key: str, lang: str, **kwargs) -> str:
    """Pick the best available line for a language and fill placeholders."""
    pack = R.get(key, {})
    template = pack.get(lang) or pack.get("en", "")
    if lang not in pack and kwargs:
        # English fallback still localizes numerals when possible
        pass
    try:
        return template.format(**kwargs)
    except Exception:
        try:
            return pack.get("en", "").format(**kwargs)
        except Exception:
            return pack.get("en", "")


def localize_numbers(text: str, lang: str) -> str:
    """Convert ASCII digits to regional numerals for supported scripts."""
    numerals = {
        "kn": "೦೧೨೩೪೫೬೭೮೯", "hi": "०१२३४५६७८९", "mr": "०१२३४५६७८९",
        "te": "౦౧౨౩౪౫౬౭౮౯", "ta": "௦௧௨௩௪௫௬௭௮௯", "ml": "൦൧൨൩൪൫൬൭൮൯",
        "bn": "০১২৩৪৫৬৭৮৯", "gu": "૦૧૨૩૪૫૬૭૮૯", "pa": "੦੧੨੩੪੫੬੭੮੯",
    }
    digits = numerals.get(lang)
    if not digits:
        return text
    return "".join(digits[int(ch)] if ch.isdigit() else ch for ch in text)


def product_label(result: Dict[str, Any], lang: str, fallback: str = "item") -> str:
    """Localized product label for speech."""
    if lang == "kn" and result.get("product_kn"):
        return result["product_kn"]
    return result.get("product") or fallback
