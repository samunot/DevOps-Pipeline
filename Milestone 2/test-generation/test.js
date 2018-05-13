const request = require('request');
const mongodb = require('mongodb');
const assert = require('assert');
const {URL} = require('url');
mongoUrl = new URL('mongodb://');
mongoUrl.host = process.env.MONGO_HOST || 'localhost:27017';
mongoUrl.username = process.env.MONGO_USER || 'admin';
mongoUrl.password = process.env.MONGO_PASSWD || 'MonGoPaSsWoRd';
mongoUrl.pathname = '/';
mongoUrl.search = 'authSource=admin';
mongodb.MongoClient.connect(mongoUrl.href, function (err, client) {
    assert.equal(null, err);
    const db = client.db('site');
    createFixture(db, function () {
        client.close();
    });
});
function createFixture(db, callback) {
    const collection = db.collection('studies');
    token = '1';
    id = mongodb.ObjectId('000000000000000000000001');
    collection.update({ _id: id }, {
        _id: id,
        name: 'Study Number 1',
        description: 'A very special study.',
        studyKind: 'survey',
        researcherName: 'Luis Sanchez',
        contact: 'lsanche@ncsu.edu',
        awards: 'None',
        awardOptions: [
            'Amazon Gift Card',
            'Github Swag',
            'BrowserStack',
            'Windows Surface RT',
            'iPad Mini',
            'Other',
            'None'
        ],
        status: 'open',
        goal: 100,
        invitecode: 'RESEARCH',
        markdown: '# Study',
        token: token,
        adminLink: '/studies/admin/?token=' + token,
        publicLink: '/studies/?id=' + id
    }, { upsert: true }, function (err, result) {
        assert.equal(err, null);
        console.log('Fixture created');
        callback(result);
    });
}
host = process.env.TARGET_HOST || 'localhost:80';
mongoHost = process.env.MONGO_HOST || 'localhost:27017';
mongoUser = process.env.MONGO_USER || 'admin';
mongoPasswd = process.env.MONGO_PASSWD || 'MonGoPaSsWoRd';
request({
    method: 'POST',
    uri: 'http://' + host + '/api/design/survey'
}, function () {
});
request({
    method: 'GET',
    uri: 'http://' + host + '/api/study/load/000000000000000000000001'
}, function () {
});
request({
    method: 'GET',
    uri: 'http://' + host + '/api/study/vote/status',
    qs: {
        studyId: '000000000000000000000001',
        fingerprint: 'good_fingerprint'
    }
}, function () {
});
request({
    method: 'GET',
    uri: 'http://' + host + '/api/study/vote/status',
    qs: {
        studyId: '000000000000000000000001',
        fingerprint: 'bad_fingerprint'
    }
}, function () {
});
request({
    method: 'GET',
    uri: 'http://' + host + '/api/study/vote/status',
    qs: { studyId: '000000000000000000000001' }
}, function () {
});
request({
    method: 'GET',
    uri: 'http://' + host + '/api/study/vote/status',
    qs: {
        studyId: 'bad_studyId',
        fingerprint: 'good_fingerprint'
    }
}, function () {
});
request({
    method: 'GET',
    uri: 'http://' + host + '/api/study/vote/status',
    qs: {
        studyId: 'bad_studyId',
        fingerprint: 'bad_fingerprint'
    }
}, function () {
});
request({
    method: 'GET',
    uri: 'http://' + host + '/api/study/vote/status',
    qs: { studyId: 'bad_studyId' }
}, function () {
});
request({
    method: 'GET',
    uri: 'http://' + host + '/api/study/vote/status',
    qs: { fingerprint: 'good_fingerprint' }
}, function () {
});
request({
    method: 'GET',
    uri: 'http://' + host + '/api/study/vote/status',
    qs: { fingerprint: 'bad_fingerprint' }
}, function () {
});
request({
    method: 'GET',
    uri: 'http://' + host + '/api/study/vote/status'
}, function () {
});
request({
    method: 'GET',
    uri: 'http://' + host + '/api/study/status/000000000000000000000001'
}, function () {
});
request({
    method: 'GET',
    uri: 'http://' + host + '/api/study/listing'
}, function () {
});
request({
    method: 'POST',
    uri: 'http://' + host + '/api/study/create',
    form: {
        invitecode: 'RESEARCH',
        studyKind: 'survey'
    }
}, function () {
});
request({
    method: 'POST',
    uri: 'http://' + host + '/api/study/create',
    form: {
        invitecode: 'RESEARCH',
        studyKind: 'dataStudy'
    }
}, function () {
});
request({
    method: 'POST',
    uri: 'http://' + host + '/api/study/vote/submit/'
}, function () {
});
request({
    method: 'GET',
    uri: 'http://' + host + '/api/study/admin/1'
}, function () {
});
request({
    method: 'GET',
    uri: 'http://' + host + '/api/study/admin/download/1'
}, function () {
});
request({
    method: 'GET',
    uri: 'http://' + host + '/api/study/admin/assign/1'
}, function () {
});
request({
    method: 'POST',
    uri: 'http://' + host + '/api/study/admin/open/',
    form: { token: '1' }
}, function () {
});
request({
    method: 'POST',
    uri: 'http://' + host + '/api/study/admin/close/',
    form: { token: '1' }
}, function () {
});
request({
    method: 'POST',
    uri: 'http://' + host + '/api/study/admin/notify/',
    form: {
        email: 'lsanche@ncsu.edu',
        kind: 'AMZN'
    }
}, function () {
});
request({
    method: 'POST',
    uri: 'http://' + host + '/api/study/admin/notify/',
    form: {
        email: 'lsanche@ncsu.edu',
        kind: 'SURFACE'
    }
}, function () {
});
request({
    method: 'POST',
    uri: 'http://' + host + '/api/study/admin/notify/',
    form: {
        email: 'lsanche@ncsu.edu',
        kind: 'IPADMINI'
    }
}, function () {
});
request({
    method: 'POST',
    uri: 'http://' + host + '/api/study/admin/notify/',
    form: {
        email: 'lsanche@ncsu.edu',
        kind: 'GITHUB'
    }
}, function () {
});
request({
    method: 'POST',
    uri: 'http://' + host + '/api/study/admin/notify/',
    form: {
        email: 'lsanche@ncsu.edu',
        kind: 'BROWSERSTACK'
    }
}, function () {
});
