# The Matching Game App - Front End

This is the React frontend of a full-stack, React-Rails matching game application. Users can play games consisting of up to 100 of their own uploaded images, randomly selected from their image library for each new game, and their win totals are stored for future reference. The application utilizes AWS S3 storage and a PostgreSQL database to save users' pictures and associated categories.

Some of the application's additional features include:

- Responsive design allowing for seamless use on phones, tablets, and computer monitors
- Progressive Web App elements including a service worker, app manifest, and splash screen
- Wide-ranging accessibility via ARIA attributes, well-organized tab order, and AA-compliant color contrast 
- Multi-version cross-browser compatability, including complete functionality on Chrome, Safari, Firefox, and other browsers for versions accounting for nearly 90% of all internet users worldwide (based on data from caniuse.com)
- Comprehensive authentication with Devise, including timeoutable, lockable, and validatable features
- Resizes, compresseses, and reorients images based on EXIF data for efficient storage and retrieval
- Handles errors effectively and provides users with informative and differentiated error messages and HTTP status codes
- Ensures security for user data by mitigating XSS, CSRF, and the entirety of the OWASP Top Ten through front and back end validation, HTTPS redirection, and various other security measures
- Optimized load time and performance with lazy loading, efficient caching, and code minification
- 90+ scores in all Lighthouse audit categories and a perfect 13/13 in the PWA check

The Ruby On Rails backend can be found at https://github.com/sean-vanadia/matching-game-rails-api.
<br /><br />
Copyright &copy; 2019 Sean Vanadia
