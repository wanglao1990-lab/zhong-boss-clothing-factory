import React, { useState } from 'react';

const Factory = () => {
    const [machines, setMachines] = useState([]);
    const [productionStatus, setProductionStatus] = useState('Not Started');
    const [clothesCollected, setClothesCollected] = useState([]);

    const handleAddMachine = (machine) => {
        setMachines([...machines, machine]);
    };

    const handleStartProduction = () => {
        setProductionStatus('Producing');
        // Logic for starting production
    };

    const handleCollectClothes = () => {
        // Logic for collecting clothes
        setClothesCollected([...clothesCollected, 'New Clothes Item']);
    };

    return (
        <div>
            <h1>Factory Machines</h1>
            <ul>
                {machines.map((machine, index) => (
                    <li key={index}>{machine}</li>
                ))}
            </ul>
            <button onClick={() => handleAddMachine('Sewing Machine')}>Add Sewing Machine</button>
            <button onClick={handleStartProduction}>Start Production</button>
            <h2>Production Status: {productionStatus}</h2>
            <button onClick={handleCollectClothes}>Collect Clothes</button>
            <h2>Clothing Collection:</h2>
            <ul>
                {clothesCollected.map((item, index) => (
                    <li key={index}>{item}</li>
                ))}
            </ul>
        </div>
    );
};

export default Factory;
