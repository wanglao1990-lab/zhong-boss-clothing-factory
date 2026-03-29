import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import './App.css';

const SOCKET_SERVER_URL = 'http://your-socket-server.com'; // replace with your Socket.IO server URL

const App = () => {
  const [players, setPlayers] = useState([]);
  const [machines, setMachines] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [activeView, setActiveView] = useState('factory');

  useEffect(() => {
    const socket = io(SOCKET_SERVER_URL);

    socket.on('updatePlayers', (data) => {
      setPlayers(data);
    });

    socket.on('updateMachines', (data) => {
      setMachines(data);
    });

    socket.on('updateInventory', (data) => {
      setInventory(data);
    });

    return () => socket.disconnect();
  }, []);

  return (
    <div className="app">
      <h1>Clothing Factory Game</h1>
      <nav>
        <button onClick={() => setActiveView('factory')}>Factory</button>
        <button onClick={() => setActiveView('shop')}>Shop</button>
      </nav>
      {activeView === 'factory' ? (
        <FactoryView players={players} machines={machines} />
      ) : (
        <ShopView inventory={inventory} />
      )}
    </div>
  );
};

const FactoryView = ({ players, machines }) => {
  return (
    <div>
      <h2>Factory Machines</h2>
      {/* Render factory machines and player info here */}
    </div>
  );
};

const ShopView = ({ inventory }) => {
  return (
    <div>
      <h2>Shop Inventory</h2>
      {/* Render shop inventory here */}
    </div>
  );
};

export default App;