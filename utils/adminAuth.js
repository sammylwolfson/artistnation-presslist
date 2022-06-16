const withAdminAuth = (req, res, next) => {
    if (req.session.user_id === 1){
        req.mainAdmin = true
        next();
    } else {
        console.log('You do not have authorization for this page')
        res.redirect('/');
    }
};

module.exports = withAdminAuth;