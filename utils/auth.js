const withAuth = (req, res, next) => {
    if (!req.session.user_id){
        res.redirect('/login');
    } 
    else if(req.session.user_id === 1) {
        req.mainAdmin = true;
        next();
    } 
    else {
        next();
    };
};

module.exports = withAuth;