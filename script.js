// Funktion zur Anzeige der Ladeanimation
function showLoadingAnimation() {
  // Erstelle ein Overlay-Element
  const overlay = document.createElement('div');
  overlay.id = 'loading-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  overlay.style.zIndex = '9999';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.color = '#fff';
  overlay.style.fontSize = '20px';

  // Füge einen Text hinzu
  const text = document.createElement('div');
  text.innerText = 'Bitte warten, Downloads laufen...';
  overlay.appendChild(text);

  // Füge eine einfache Ladeanimation hinzu
  const spinner = document.createElement('div');
  spinner.id = 'loading-spinner';
  spinner.style.border = '16px solid #f3f3f3';
  spinner.style.borderTop = '16px solid #3498db';
  spinner.style.borderRadius = '50%';
  spinner.style.width = '120px';
  spinner.style.height = '120px';
  spinner.style.animation = 'spin 2s linear infinite';
  overlay.appendChild(spinner);

  // Füge das Overlay zum Dokument hinzu
  document.body.appendChild(overlay);

  // Füge die CSS-Animation hinzu
  const style = document.createElement('style');
  style.type = 'text/css';
  style.innerHTML = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

// Funktion zum Entfernen der Ladeanimation
function hideLoadingAnimation() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    document.body.removeChild(overlay);
  }
}

// Funktion zum Sammeln der Kursinformationen
function collectActiveCourseInfo() {
  const activeTab = document.querySelector('.courseviewtabcontent.tab-pane.active');
  if (!activeTab) {
    console.error('Aktiver Tab nicht gefunden');
    return [];
  }

  const courseItems = activeTab.querySelectorAll('.course-list-item');
  const courseInfo = [];

  courseItems.forEach(item => {
    const courseLink = item.querySelector('a[href^="https://moodle.technikum-wien.at/course/view.php?id="]');
    if (courseLink) {
      const href = courseLink.getAttribute('href');
      const match = href.match(/id=(\d+)/);
      if (match && match[1]) {
        const courseId = match[1];
        const courseNameElement = item.querySelector('.fullname');
        const courseName = courseNameElement ? courseNameElement.textContent.trim() : `Course_${courseId}`;
        courseInfo.push({ id: courseId, name: courseName });
      }
    }
  });

  return courseInfo;
}

// Funktion zum Extrahieren des Dateinamens aus dem Header
function getFilenameFromHeader(headers) {
  const contentDisposition = headers.get('Content-Disposition');
  if (contentDisposition && contentDisposition.includes('filename=')) {
    const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
    if (filenameMatch && filenameMatch[1]) {
      let filename = filenameMatch[1].replace(/['"]/g, '');
      // Dekodiere URL-kodierte Dateinamen
      filename = decodeURIComponent(filename);
      return filename;
    }
  }
  return null;
}

// Funktion zum Herunterladen eines einzelnen Kurses
async function downloadCourse(course) {
  const url = `https://moodle.technikum-wien.at/local/downloadcenter/index.php?courseid=${course.id}`;
  
  try {
    // Abrufen der Download-Seite
    const response = await fetch(url, { 
      credentials: 'include'
    });

    if (!response.ok) throw new Error(`HTTP-Fehler! Status: ${response.status}`);
    const html = await response.text();

    // Parsen des HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extrahieren des sesskey
    const sesskeyInput = doc.querySelector('input[name="sesskey"]');
    const sesskey = sesskeyInput ? sesskeyInput.value : '';

    // Vorbereiten der Formulardaten
    const formData = new FormData();
    formData.append('courseid', course.id);
    formData.append('sesskey', sesskey);
    formData.append('_qf__local_downloadcenter_download_form', '1');
    formData.append('mform_isexpanded_id_downloadoptions', '1');
    formData.append('addnumbering', '1');

    // Alle Checkboxen auswählen
    doc.querySelectorAll('input[type="checkbox"][name^="item_"]').forEach(checkbox => {
      formData.append(checkbox.name, '1');
    });

    formData.append('submitbutton', 'ZIP-Archiv erstellen');

    // Senden der Download-Anfrage
    const downloadResponse = await fetch(url, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    if (downloadResponse.ok) {
      const blob = await downloadResponse.blob();
      const filename = getFilenameFromHeader(downloadResponse.headers) || `${course.id}_${course.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.zip`;
      console.log(`Download abgeschlossen für: ${course.name} (ID: ${course.id})`);

      // Initiieren des Dateidownloads
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);

      // Entfernen des Anker-Elements
      document.body.removeChild(a);

      return null; // Rückgabe null, da der Download direkt erfolgt
    } else {
      console.error(`Download fehlgeschlagen für: ${course.name} (ID: ${course.id})`, downloadResponse.statusText);
    }
  } catch (error) {
    console.error(`Fehler beim Verarbeiten von: ${course.name} (ID: ${course.id})`, error);
  }
  return null;
}

// Funktion zum gleichzeitigen Herunterladen von Kursen mit Begrenzung
async function downloadCoursesConcurrently(courseInfo, concurrencyLimit = 2) {
  let currentIndex = 0;

  // Worker-Funktion zum Verarbeiten der Downloads
  const worker = async () => {
    while (currentIndex < courseInfo.length) {
      const course = courseInfo[currentIndex++];
      console.log(`Verarbeite Kurs: ${course.name} (ID: ${course.id})`);
      await downloadCourse(course);
    }
  };

  // Erstellen eines Arrays von Worker-Promises
  const workers = [];
  for (let i = 0; i < concurrencyLimit; i++) {
    workers.push(worker());
  }

  // Warten, bis alle Worker abgeschlossen sind
  await Promise.all(workers);
}

// Starten des Download-Prozesses mit Ladeanimation
async function start() {
  // Ladeanimation anzeigen
  showLoadingAnimation();

  const courseInfo = collectActiveCourseInfo(); // Alle Kurse im aktiven Tab verarbeiten
  console.log('Gesammelte aktive Kurse:', courseInfo);

  if (courseInfo.length === 0) {
    console.log('Keine Kurse zum Herunterladen gefunden.');
    hideLoadingAnimation();
    return;
  }

  await downloadCoursesConcurrently(courseInfo, 5); // Anpassung der Gleichzeitigkeit nach Bedarf

  // Ladeanimation ausblenden
  hideLoadingAnimation();

  console.log('Alle Downloads abgeschlossen.');
}

start();
