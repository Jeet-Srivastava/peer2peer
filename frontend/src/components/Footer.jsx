function Footer() {
    return (
        <footer className="footer" id="main-footer">
            <div className="container">
                <p className="footer-text">
                    &copy; {new Date().getFullYear()} <span className="accent">peer2peer</span> &mdash; Built for students, by students.
                </p>
            </div>
        </footer>
    );
}

export default Footer;
