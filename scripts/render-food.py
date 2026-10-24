"""Render the project's original procedural models into offline fallback PNGs."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
 page=b.new_page(viewport={'width':600,'height':420},device_scale_factor=1)
 page.goto(os.environ.get('EXPLORER_URL','http://127.0.0.1:8000')+'/?test',wait_until='networkidle')
 page.wait_for_function('document.body.dataset.ready==="true"')
 page.evaluate('''async()=>{__explorer.ui.openPanel(document.getElementById('help'),document.getElementById('help-close'));const host=document.createElement('div');host.id='render-food';host.style.cssText='position:fixed;inset:0;z-index:9999;background:#e4d4b8';document.body.append(host);const {createFoodRenderer}=await import('./src/food-models.js?v=6.4.0');window.foodRenderer=createFoodRenderer(host);}''')
 output=root/'assets/food-3d';output.mkdir(exist_ok=True)
 for i,name in enumerate(['noodles','cold-noodles','breakfast','naan','rice','dumplings','sushi','thai','soup','skewers'],1):
  page.evaluate('(id)=>foodRenderer.show(id,{powerSaving:false})',i)
  page.locator('#render-food').screenshot(path=str(output/(name+'.png')))
  print('Rendered',name,flush=True)
 b.close()
