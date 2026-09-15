from pathlib import Path

p=Path('admin.html')
text=p.read_text()

# Add hidden icon value next to selected image value.
old='<input type="hidden" id="serviceImageUrl">'
new='<input type="hidden" id="serviceImageUrl"><input type="hidden" id="serviceIcon">'
if old not in text:
    raise SystemExit('service image hidden field marker not found')
text=text.replace(old,new,1)

# Add visual icon picker below the stock-image picker.
old='''<div class="field full"><label>Stock image</label><p class="service-image-help">Choose the photo that will appear on this service card on the main website.</p><div class="service-image-grid" id="serviceImageGrid" role="radiogroup" aria-label="Choose a stock image"></div></div>'''
new='''<div class="field full"><label>Stock image</label><p class="service-image-help">Choose the photo that will appear on this service card on the main website.</p><div class="service-image-grid" id="serviceImageGrid" role="radiogroup" aria-label="Choose a stock image"></div></div><div class="field full"><label>Service icon</label><p class="service-image-help">Choose the icon shown in the circle on the service card.</p><div class="service-icon-grid" id="serviceIconGrid" role="radiogroup" aria-label="Choose a service icon"></div></div>'''
if old not in text:
    raise SystemExit('stock image picker marker not found')
text=text.replace(old,new,1)

icon_code='''const SERVICE_ICON_OPTIONS=[
  {label:"Home",value:"fa-solid fa-house-chimney"},
  {label:"Sparkles",value:"fa-solid fa-sparkles"},
  {label:"Spray bottle",value:"fa-solid fa-spray-can-sparkles"},
  {label:"Soap",value:"fa-solid fa-soap"},
  {label:"Broom",value:"fa-solid fa-broom"},
  {label:"Bucket",value:"fa-solid fa-bucket"},
  {label:"Bed",value:"fa-solid fa-bed"},
  {label:"Building",value:"fa-solid fa-building"},
  {label:"Boxes",value:"fa-solid fa-box-open"},
  {label:"Construction",value:"fa-solid fa-helmet-safety"},
  {label:"Kitchen",value:"fa-solid fa-kitchen-set"},
  {label:"Bath",value:"fa-solid fa-bath"},
  {label:"Couch",value:"fa-solid fa-couch"},
  {label:"Office",value:"fa-solid fa-briefcase"},
  {label:"Store",value:"fa-solid fa-store"},
  {label:"Hotel",value:"fa-solid fa-hotel"},
  {label:"Car",value:"fa-solid fa-car"},
  {label:"Party",value:"fa-solid fa-champagne-glasses"},
  {label:"Star",value:"fa-solid fa-star"},
  {label:"Shield",value:"fa-solid fa-shield-heart"}
];
function renderServiceIconPicker(selectedIcon=""){
  if(!serviceIconGrid)return;
  serviceIconGrid.innerHTML=SERVICE_ICON_OPTIONS.map(item=>`<button type="button" class="service-icon-option${item.value===selectedIcon?" selected":""}" data-service-icon="${esc(item.value)}" role="radio" aria-checked="${item.value===selectedIcon}" title="${esc(item.label)}"><span class="service-icon-preview"><i class="${esc(item.value)}"></i></span><span>${esc(item.label)}</span><i class="fa-solid fa-circle-check service-icon-check" aria-hidden="true"></i></button>`).join("");
  serviceIconGrid.querySelectorAll("[data-service-icon]").forEach(button=>{
    button.onclick=()=>{
      serviceIcon.value=button.dataset.serviceIcon;
      serviceIconGrid.querySelectorAll(".service-icon-option").forEach(option=>{
        const selected=option===button;
        option.classList.toggle("selected",selected);
        option.setAttribute("aria-checked",String(selected));
      });
    };
  });
}
'''
marker='function openService(r=null){'
if marker not in text:
    raise SystemExit('openService marker not found')
text=text.replace(marker,icon_code+marker,1)

old='''  serviceImageUrl.value=r?.imageUrl||SERVICE_STOCK_IMAGES[0].url;
  renderServiceImagePicker(serviceImageUrl.value);
  serviceDialog.showModal();'''
new='''  serviceImageUrl.value=r?.imageUrl||SERVICE_STOCK_IMAGES[0].url;
  serviceIcon.value=r?.icon||"fa-solid fa-house-chimney";
  renderServiceImagePicker(serviceImageUrl.value);
  renderServiceIconPicker(serviceIcon.value);
  serviceDialog.showModal();'''
if old not in text:
    raise SystemExit('openService image selection marker not found')
text=text.replace(old,new,1)

old='''      image_url:serviceImageUrl.value||null,
      is_live:true'''
new='''      image_url:serviceImageUrl.value||null,
      icon:serviceIcon.value||"fa-solid fa-house-chimney",
      is_live:true'''
if old not in text:
    raise SystemExit('service save payload marker not found')
text=text.replace(old,new,1)

css='''
/* ===== Service icon picker ===== */
.service-icon-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px}
.service-icon-option{position:relative;min-width:0;padding:10px 6px 8px;border:2px solid transparent;border-radius:14px;background:#f4fafc;color:var(--ink);display:grid;place-items:center;gap:6px;font-size:9px;font-weight:900;transition:.16s;box-shadow:0 5px 14px rgba(0,26,56,.06)}
.service-icon-option:hover{transform:translateY(-2px);border-color:rgba(32,221,236,.55)}
.service-icon-preview{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:var(--cyan);color:var(--navy);font-size:18px;box-shadow:0 5px 12px rgba(0,26,56,.12)}
.service-icon-option>span:last-of-type{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.service-icon-check{position:absolute;right:5px;top:5px;color:var(--navy2);background:#fff;border-radius:50%;opacity:0;transform:scale(.7);transition:.16s}
.service-icon-option.selected{border-color:var(--cyan);box-shadow:0 0 0 3px rgba(32,221,236,.16),0 8px 18px rgba(0,26,56,.11)}
.service-icon-option.selected .service-icon-check{opacity:1;transform:scale(1)}
html[data-theme="dark"] .service-icon-option{background:#09243b;color:#f4fcff}
@media(max-width:700px){.service-icon-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.service-icon-option{font-size:8px}}
'''
style_marker='</style>\n</head>'
if style_marker not in text:
    raise SystemExit('style marker not found')
text=text.replace(style_marker,css+'\n'+style_marker,1)

p.write_text(text)
