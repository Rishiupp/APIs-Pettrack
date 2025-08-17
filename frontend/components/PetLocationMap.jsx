import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, Text, TouchableOpacity, Linking, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
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
      
      // Fetch both QR scan locations and general pet locations
      const [scanResponse, locationResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/qr/pets/${petId}/locations`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${API_BASE_URL}/api/v1/pets/${petId}/locations`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      ]);

      const [scanData, locationData] = await Promise.all([
        scanResponse.ok ? scanResponse.json() : { success: false, data: [] },
        locationResponse.ok ? locationResponse.json() : { success: false, data: [] }
      ]);
      
      // Combine both types of locations
      const allLocations = [];
      
      if (scanData.success && scanData.data) {
        scanData.data.forEach(location => {
          allLocations.push({
            ...location,
            type: 'scan',
            timestamp: location.timestamp || location.createdAt
          });
        });
      }
      
      if (locationData.success && locationData.data) {
        locationData.data.forEach(location => {
          allLocations.push({
            ...location,
            type: 'location',
            timestamp: location.createdAt
          });
        });
      }
      
      // Sort by timestamp (newest first)
      allLocations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      if (allLocations.length > 0) {
        setLocations(allLocations);
        
        // Set initial region to first location
        setRegion({
          latitude: allLocations[0].latitude,
          longitude: allLocations[0].longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        });
      } else {
        setLocations([]);
      }
    } catch (error) {
      console.error('Error fetching pet locations:', error);
      Alert.alert('Error', 'Failed to fetch pet locations');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const openInMaps = (latitude, longitude, locationName = 'Pet Location') => {
    const coordinates = `${latitude},${longitude}`;
    const label = encodeURIComponent(locationName);
    
    Alert.alert(
      'Open in Maps',
      'Choose your preferred map application',
      [
        {
          text: 'Google Maps',
          onPress: () => {
            const url = Platform.select({
              ios: `comgooglemaps://?q=${coordinates}&center=${coordinates}&zoom=15`,
              android: `geo:${coordinates}?q=${coordinates}(${label})`,
            });
            const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${coordinates}`;
            
            Linking.canOpenURL(url).then(supported => {
              if (supported) {
                Linking.openURL(url);
              } else {
                Linking.openURL(fallbackUrl);
              }
            });
          }
        },
        {
          text: 'Apple Maps',
          onPress: () => {
            const url = `http://maps.apple.com/?q=${label}&ll=${coordinates}&z=15`;
            Linking.openURL(url);
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
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
        {locations.map((location, index) => {
          const isPrimaryLocation = index === 0;
          const isLocationReport = location.type === 'location';
          const markerColor = isPrimaryLocation ? '#FF4444' : (isLocationReport ? '#FF9500' : '#007AFF');
          
          return (
            <Marker
              key={location.id}
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              title={isLocationReport ? `Location Report #${locations.filter(l => l.type === 'location').indexOf(location) + 1}` : `QR Scan #${locations.filter(l => l.type === 'scan').indexOf(location) + 1}`}
              description={`${formatDateTime(location.timestamp)}\n${location.city || location.locationName || 'Unknown location'}`}
              pinColor={markerColor}
              onCalloutPress={() => openInMaps(
                location.latitude, 
                location.longitude, 
                isLocationReport ? 'Pet Location Report' : 'Pet QR Scan Location'
              )}
            />
          );
        })}
      </MapView>
      
      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <View style={styles.infoLeft}>
            <Text style={styles.infoText}>
              {locations.length} location{locations.length > 1 ? 's' : ''} found
            </Text>
            <Text style={styles.lastScanText}>
              Latest: {formatDateTime(locations[0].timestamp)}
            </Text>
            <Text style={styles.locationTypeText}>
              {locations[0].type === 'location' ? '📍 Location Report' : '📱 QR Scan'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => openInMaps(
              locations[0].latitude,
              locations[0].longitude,
              locations[0].type === 'location' ? 'Pet Location Report' : 'Pet QR Scan'
            )}
          >
            <Ionicons name="map" size={20} color="#007AFF" />
            <Text style={styles.mapButtonText}>Open in Maps</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF4444' }]} />
            <Text style={styles.legendText}>Latest</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF9500' }]} />
            <Text style={styles.legendText}>Location Reports</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#007AFF' }]} />
            <Text style={styles.legendText}>QR Scans</Text>
          </View>
        </View>
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoLeft: {
    flex: 1,
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
  locationTypeText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 2,
    fontWeight: '500',
  },
  mapButton: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  mapButtonText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    marginTop: 2,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
});

export default PetLocationMap;