# Moodle Course Downloader

This JavaScript tool allows you to download multiple Moodle courses simultaneously from the active tab in your browser. It's designed to work with the Moodle instance at Technikum Wien, but it may be adaptable to other Moodle installations.

## Features

- Automatically detects courses in the active tab
- Downloads course content as ZIP files
- Combines all downloaded courses into a single ZIP file
- Implements error handling and timeout mechanisms

## Prerequisites

- A modern web browser (Chrome, Firefox, Edge, etc.)
- Active login session on your Moodle platform

## Usage

1. Navigate to your Moodle dashboard or course overview page. (https://moodle.technikum-wien.at/my)
2. Open your browser's developer console (usually F12 or Ctrl+Shift+I).
3. Copy and paste the entire script into the console.
4. Run the script by calling the `start()` function in the console.

The script will automatically:
- Collect course information from the active tab
- Download each course
- Combine all downloads into a single ZIP file named `active_tab_courses.zip`

## Important Notes

- This script uses the JSZip library, which it loads dynamically if not already present.
- There's a 5-second delay between processing each course to avoid overwhelming the server.
- Downloads have a 60-second timeout to prevent hanging on large courses.
- Make sure you're on a stable internet connection when running this script.

## Disclaimer

This tool is for personal use only. Always respect your institution's policies regarding content downloading and usage.
