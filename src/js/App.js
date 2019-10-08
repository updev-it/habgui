import React from 'react';

import {
    BrowserRouter as Router,
    Route,
    Switch,
    Link
} from 'react-router-dom'

// We'll load our views from the `src/views`
// directory
// import Home from './views/Home/Home';
// import About from './views/About/About';

const Home = () => (<div><h1>Welcome home</h1><Link to='/about'>Go to about</Link></div>)
const About = () => (<div><h1>About</h1><Link to='/'>Go home</Link></div>);

class App extends React.Component {
    render() {
        return (
            <Router>
                <Switch>
                    <Route
                        path="/about"
                        component={About} />
                    <Route
                        path="*"
                        component={Home} />
                </Switch>
            </Router>
        )
    }
}

export default App;