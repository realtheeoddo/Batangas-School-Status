# Batangas School Status

**Batangas School Status** is a web application that provides real-time information on school suspensions, holidays, and class schedules for all 34 cities and municipalities in Batangas, Philippines. The platform is designed to give students, parents, and educators instant access to accurate and up-to-date data without having to manually check multiple sources.

## Features

* **Real-Time Updates**: Data is fetched when the website is opened or when the user clicks the "Refresh Data" button. No automatic background refresh is performed, giving full control to the user.
* **School Status Overview**: Displays current status for today and tomorrow for each city/municipality, including whether there are normal classes, school suspensions, or holidays.
* **Holiday Integration**: Uses the [Nager.Date API](https://date.nager.at/) to detect Philippine public holidays and display them alongside local school announcements.
* **Animated & Interactive Interface**: Fully styled and animated cards that indicate school status with colors, hover effects, and smooth transitions.
* **Searchable Cities**: Quickly find specific cities or municipalities using the integrated search bar.
* **Visual Indicators**: Each city/municipality is paired with a relevant emoji for easier recognition.
* **Disclaimer for Tomorrow’s Status**: If there is no official announcement for the next day, the app assumes normal classes and adds a small “(subject to change)” note for clarity.

## Data Sources

* **Rappler “Walang Pasok” Announcements**: Official daily class suspension updates.
* **Nager.Date API**: Provides accurate Philippine public holiday information.

This project is ideal for anyone in Batangas who wants a quick and reliable overview of school statuses across the province, all in one place with a smooth, animated, and user-friendly interface.
