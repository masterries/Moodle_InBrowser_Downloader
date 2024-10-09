// Function to load JSZip library
function loadJSZip() {
  return new Promise((resolve, reject) => {
    if (window.JSZip) {
      resolve(window.JSZip);
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js';
      script.onload = () => resolve(window.JSZip);
      script.onerror = reject;
      document.head.appendChild(script);
    }
  });
}

// Function to combine and download all files
async function combineAndDownloadFiles(files) {
  const JSZip = await loadJSZip();
  const zip = new JSZip();

  files.forEach(file => {
    zip.file(file.filename, file.blob);
  });

  const content = await zip.generateAsync({ type: "blob" });
  const url = window.URL.createObjectURL(content);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = 'active_tab_courses.zip';
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
}

// Function to collect Moodle course IDs and names from the active tab
function collectActiveCourseInfo() {
  const activeTab = document.querySelector('.courseviewtabcontent.tab-pane.active');
  if (!activeTab) {
    console.error('Active tab not found');
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
        const courseName = item.querySelector('.fullname').textContent.trim();
        courseInfo.push({ id: courseId, name: courseName });
      }
    }
  });

  return courseInfo;
}

// Function to download courses using the collected info
async function downloadMoodleCourses() {
  const courseInfo = collectActiveCourseInfo();
  console.log('Collected active courses:', courseInfo);

  const allFiles = [];

  for (const course of courseInfo) {
    console.log(`Processing course: ${course.name} (ID: ${course.id})`);
    const file = await downloadCourse(course);
    if (file) {
      allFiles.push(file);
    }
    // Wait for 5 seconds before processing the next course
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  if (allFiles.length > 0) {
    await combineAndDownloadFiles(allFiles);
  } else {
    console.log('No course files were downloaded.');
  }
}

// Function to download a single course
async function downloadCourse(course) {
  const url = `https://moodle.technikum-wien.at/local/downloadcenter/index.php?courseid=${course.id}`;
  
  try {
    // Create an AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    // Fetch the download center page
    const response = await fetch(url, { 
      credentials: 'include',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const html = await response.text();

    // Parse the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extract the sesskey
    const sesskeyInput = doc.querySelector('input[name="sesskey"]');
    const sesskey = sesskeyInput ? sesskeyInput.value : '';

    // Prepare the form data
    const formData = new FormData();
    formData.append('courseid', course.id);
    formData.append('sesskey', sesskey);
    formData.append('_qf__local_downloadcenter_download_form', '1');
    formData.append('mform_isexpanded_id_downloadoptions', '1');
    formData.append('addnumbering', '1');

    // Check all item checkboxes
    doc.querySelectorAll('input[type="checkbox"][name^="item_"]').forEach(checkbox => {
      formData.append(checkbox.name, '1');
    });

    formData.append('submitbutton', 'ZIP-Archiv erstellen');

    // Send the download request with a new AbortController
    const downloadController = new AbortController();
    const downloadTimeoutId = setTimeout(() => downloadController.abort(), 60000); // 60 second timeout

    const downloadResponse = await fetch(url, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      signal: downloadController.signal
    });
    clearTimeout(downloadTimeoutId);

    if (downloadResponse.ok) {
      const blob = await downloadResponse.blob();
      const filename = getFilenameFromHeader(downloadResponse.headers) || `${course.id}_${course.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.zip`;
      console.log(`Download completed for: ${course.name} (ID: ${course.id})`);
      return { blob, filename };
    } else {
      console.error(`Download failed for: ${course.name} (ID: ${course.id})`, downloadResponse.statusText);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`Timeout while processing: ${course.name} (ID: ${course.id})`);
    } else {
      console.error(`Error processing: ${course.name} (ID: ${course.id})`, error);
    }
  }
  return null;
}

// Function to get filename from Content-Disposition header
function getFilenameFromHeader(headers) {
  const contentDisposition = headers.get('Content-Disposition');
  if (contentDisposition && contentDisposition.includes('filename=')) {
    const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
    if (filenameMatch && filenameMatch[1]) {
      return filenameMatch[1].replace(/['"]/g, '');
    }
  }
  return null;
}

// Start the download process
async function start() {
  await loadJSZip();
  await downloadMoodleCourses();
}

start();
