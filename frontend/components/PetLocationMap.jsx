import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, Text } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { getToken } from '../utils/storage';
import { API_BASE_URL } from '../config';

const PetLocationMap = ({ petId }) => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState(null);

  useEffect(() => {
    if (petId) {
      fetchPetScanLocations();
    }
  }, [petId]);

  const fetchPetScanLocations = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/v1/qr/pets/${petId}/locations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data.length > 0) {
        setLocations(data.data);
        
        // Set initial region to first scan location
        setRegion({
          latitude: data.data[0].latitude,
          longitude: data.data[0].longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        });
      } else {
        setLocations([]);
      }
    } catch (error) {
      console.error('Error fetching pet scan locations:', error);
      Alert.alert('Error', 'Failed to fetch pet scan locations');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading scan locations...</Text>
      </View>
    );
  }

  if (locations.length === 0) {
    return (
      <View style={styles.noDataContainer}>
        <Text style={styles.noDataText}>No scan locations found for this pet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={region}
        showsUserLocation={false}
        showsMyLocationButton={false}
        mapType="standard"
      >
        {locations.map((location, index) => (
          <Marker
            key={location.id}
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title={`Scan #${locations.length - index}`}
            description={`${formatDateTime(location.timestamp)}\n${location.city || 'Unknown location'}`}
            pinColor={index === 0 ? 'red' : 'orange'} // Latest scan in red
          />
        ))}
      </MapView>
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          {locations.length} scan location{locations.length > 1 ? 's' : ''} found
        </Text>
        <Text style={styles.lastScanText}>
          Latest: {formatDateTime(locations[0].timestamp)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  noDataText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  infoContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  infoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  lastScanText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});

export default PetLocationMap;