from pathlib import Path

p = Path('admin.html')
text = p.read_text()

head_old = '''<meta name="theme-color" content="#001a38">
<title>Admin Dashboard</title>
<link rel="icon" href="Images/logo-icon.png">'''
head_new = '''<meta name="theme-color" content="#001a38">
<meta name="application-name" content="Dashboard">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Dashboard">
<meta name="mobile-web-app-capable" content="yes">
<title>Dashboard</title>
<link rel="manifest" href="dashboard.webmanifest">
<link rel="icon" href="Images/logo-icon.png">
<link rel="apple-touch-icon" href="Images/logo-icon.png">'''

if head_old not in text:
    raise SystemExit('head marker not found')
text = text.replace(head_old, head_new, 1)

register = '''
<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./dashboard-sw.js').catch(error => {
      console.warn('App installation support could not be started.', error);
    });
  });
}
</script>
'''

marker = '</body>'
if marker not in text:
    raise SystemExit('body marker not found')
text = text.replace(marker, register + '\n' + marker, 1)

p.write_text(text)

# trigger dashboard PWA patch workflow
