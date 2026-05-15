import './App.css';
import {Route} from "react-router-dom";
import Homepage from "./Pages/Homepage";
import RootCom from './components/main/rootCom';
import GlobalMedia from "./components/main/globalMedia";
import SettingsPage from "./components/main/settingsPage";
import NotificationsPage from "./components/main/notificationsPage";
import ProfilePage from "./components/main/profilePage";

function App() {
  return (
    <div className="App">
      <Route path="/" component={Homepage} exact />
      <Route path="/chats" component={RootCom} />
      {/* <Route path="/test" component={ChatDashboardUI} exact />
      <Route path="/t" component={RootCom} exact /> */}
      <Route path="/groups" component={RootCom} exact />
      <Route path="/media" component={GlobalMedia} exact />
      <Route path="/settings" component={SettingsPage} exact />
      <Route path="/notifications" component={NotificationsPage} exact />
      <Route path="/profile" component={ProfilePage} exact />
    </div>
  );
}

export default App;
