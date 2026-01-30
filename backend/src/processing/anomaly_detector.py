import numpy as np
from typing import List, Tuple
from collections import deque

class AnomalyDetector:
    """
    Real-time anomaly detection using Z-score
    
    Detects outliers in streaming data with configurable sensitivity
    """
    
    def __init__(self, window_size: int = 100, threshold: float = 3.0):
        self.window_size = window_size
        self.threshold = threshold
        self.window = deque(maxlen=window_size)
    
    def detect(self, value: float) -> Tuple[bool, float]:
        """
        Detect if value is anomalous
        
        Returns:
            (is_anomaly, z_score)
        """
        # Add to window
        self.window.append(value)
        
        # Need enough data for statistics
        if len(self.window) < 30:
            return False, 0.0
        
        # Calculate z-score
        mean = np.mean(self.window)
        std = np.std(self.window)
        
        if std == 0:
            return False, 0.0
        
        z_score = abs((value - mean) / std)
        
        # Check if anomalous
        is_anomaly = z_score > self.threshold
        
        return is_anomaly, z_score
