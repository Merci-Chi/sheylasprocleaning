from pathlib import Path
import re

p=Path('admin.html')
text=p.read_text()

# Replace the service form with required fields, description limits, counter, and help popup trigger.
pattern=r'<dialog id="serviceDialog">.*?</dialog>'
replacement='''<dialog id="serviceDialog"><div class="modal"><div class="modal-head"><h2 id="serviceTitle">Add service</h2><button class="modal-close" data-close="serviceDialog"><i class="fa-solid fa-xmark"></i></button></div><form class="modal-body" id="serviceForm"><input type="hidden" id="serviceId"><input type="hidden" id="serviceImageUrl"><input type="hidden" id="serviceIcon"><div class="form-grid"><div class="field full"><label>Service name</label><input id="serviceName" required></div><div class="field"><label>Price label</label><input id="servicePrice" placeholder="Free estimate or $120" required></div><div class="field full"><label class="service-description-label"><span>Description</span><span class="service-description-rule">75 min · 160 max <button type="button" class="limit-help" id="serviceDescriptionHelp" aria-label="Why is there a description limit?">?</button></span></label><textarea id="serviceDescription" minlength="75" maxlength="160" required></textarea><div class="service-description-meta"><span>Keep the description concise enough to fit the website card.</span><strong><span id="serviceDescriptionCount">0</span>/160</strong></div></div><div class="field full"><label>Stock image</label><p class="service-image-help">Choose the photo that will appear on this service card on the main website.</p><div class="service-image-grid" id="serviceImageGrid" role="radiogroup" aria-label="Choose a stock image"></div></div><div class="field full"><label>Service icon</label><p class="service-image-help">Choose the icon shown in the circle on the service card.</p><div class="service-icon-grid" id="serviceIconGrid" role="radiogroup" aria-label="Choose a service icon"></div></div></div><div class="modal-actions"><button class="button ghost" type="button" data-close="serviceDialog">Cancel</button><button class="button primary">Save service</button></div></form></div></dialog>'''
text,new_count=re.subn(pattern,replacement,text,count=1,flags=re.S)
if new_count!=1:
    raise SystemExit('service dialog not replaced')

# New services must explicitly select both an image and icon. Existing services keep their saved selections.
text=text.replace('serviceImageUrl.value=r?.imageUrl||SERVICE_STOCK_IMAGES[0].url;','serviceImageUrl.value=r?.imageUrl||"";',1)
text=text.replace('serviceIcon.value=r?.icon||"fa-solid fa-house-chimney";','serviceIcon.value=r?.icon||"";',1)

# Add description counter + visuals help popup after openService.
open_pattern=r'(function openService\(r=null\)\{.*?serviceDialog\.showModal\(\);\n\})'
extra='''\nfunction updateServiceDescriptionCount(){\n  if(serviceDescriptionCount)serviceDescriptionCount.textContent=String(serviceDescription.value.length);\n}\nserviceDescription.addEventListener("input",updateServiceDescriptionCount);\nserviceDescriptionHelp.onclick=()=>showMessage(\n  "Why 75–160 characters?",\n  "This range keeps each service card visually balanced on the website. Too little text can make one card look empty, while too much text can make the card taller or crowded compared with the others.",\n  "info"\n);\n'''
text,n=re.subn(open_pattern,r'\1'+extra,text,count=1,flags=re.S)
if n!=1:
    raise SystemExit('openService block not found')

# Make the counter refresh whenever the service editor opens.
text=text.replace('renderServiceIconPicker(serviceIcon.value);\n  serviceDialog.showModal();','renderServiceIconPicker(serviceIcon.value);\n  updateServiceDescriptionCount();\n  serviceDialog.showModal();',1)

# Validate every required field before the live save starts.
marker='''serviceForm.onsubmit=async e=>{\n  e.preventDefault();'''
validation='''serviceForm.onsubmit=async e=>{\n  e.preventDefault();\n\n  const serviceNameValue=serviceName.value.trim();\n  const servicePriceValue=servicePrice.value.trim();\n  const serviceDescriptionValue=serviceDescription.value.trim();\n\n  if(!serviceNameValue)return showMessage("Service name required","Enter a service name before saving.","error");\n  if(!servicePriceValue)return showMessage("Price label required","Enter a price label such as Free estimate or $120.","error");\n  if(serviceDescriptionValue.length<75)return showMessage("Description too short","The description must be at least 75 characters so the service card has enough visual content.","error");\n  if(serviceDescriptionValue.length>160)return showMessage("Description too long","The description can be no more than 160 characters so it fits cleanly inside the service card.","error");\n  if(!serviceImageUrl.value)return showMessage("Stock image required","Choose a stock image before saving the service.","error");\n  if(!serviceIcon.value)return showMessage("Service icon required","Choose an icon before saving the service.","error");'''
if marker not in text:
    raise SystemExit('live service submit handler not found')
text=text.replace(marker,validation,1)

# Ensure the saved description uses the already-validated trimmed value.
text=text.replace('description:serviceDescription.value.trim()||null,','description:serviceDescriptionValue,',1)
# Require a real icon instead of silently assigning a default.
text=text.replace('icon:serviceIcon.value||"fa-solid fa-house-chimney",','icon:serviceIcon.value,',1)

css='''\n/* ===== Required service fields + description limits ===== */\n.service-description-label{display:flex!important;align-items:center;justify-content:space-between;gap:12px}\n.service-description-rule{display:inline-flex;align-items:center;gap:6px;color:var(--muted);font-size:9px;font-weight:900;white-space:nowrap}\n.limit-help{width:20px;height:20px;padding:0;border:1px solid var(--line);border-radius:50%;display:inline-grid;place-items:center;background:var(--cyanp);color:var(--navy2);font-size:11px;font-weight:900;line-height:1}\n.limit-help:hover{background:var(--cyan);color:var(--navy)}\n.service-description-meta{display:flex;justify-content:space-between;gap:12px;color:var(--muted);font-size:9px;line-height:1.4}\n.service-description-meta strong{color:var(--navy2);white-space:nowrap}\n#serviceDescription:invalid:not(:placeholder-shown){border-color:#d78a90}\nhtml[data-theme="dark"] .limit-help{background:#0b314e;color:#dffcff;border-color:#27516a}\n@media(max-width:560px){.service-description-label,.service-description-meta{align-items:flex-start;flex-direction:column;gap:5px}.service-description-rule{white-space:normal}}\n'''
style_marker='</style>\n</head>'
if style_marker not in text:
    raise SystemExit('style marker not found')
text=text.replace(style_marker,css+'\n'+style_marker,1)

p.write_text(text)
