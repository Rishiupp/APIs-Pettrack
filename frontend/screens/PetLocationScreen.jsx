import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PetLocationMap from '../components/PetLocationMap';
import { getToken } from '../utils/storage';
import { API_BASE_URL } from '../config';

const PetLocationScreen = ({ route, navigation }) => {
  const { petId, petName } = route.params;
  const [locations, setLocations] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showMap, setShowMap] = useState(true);

  useEffect(() => {
    navigation.setOptions({
      title: `${petName} - Scan Locations`,
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setShowMap(!showMap)}
        >
          <Ionicons 
            name={showMap ? "list" : "map"} 
            size={24} 
            color="#007AFF" 
          />
        </TouchableOpacity>
      ),
    });

    fetchScanLocations();
  }, [petId, navigation, showMap]);

  const fetchScanLocations = async () => {
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
      setLocations(allLocations);
    } catch (error) {
      console.error('Error fetching locations:', error);
      Alert.alert('Error', 'Failed to fetch locations');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchScanLocations();
    setRefreshing(false);
  };

  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays === 0) {
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`;
      }
      return `${diffHours} hours ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
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

  const renderLocationsList = () => (
    <ScrollView
      style={styles.listContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {locations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="location-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No scan locations yet</Text>
          <Text style={styles.emptySubtext}>
            Scan locations will appear here when someone scans your pet's QR code
          </Text>
        </View>
      ) : (
        locations.map((location, index) => {
          const isLocationReport = location.type === 'location';
          const iconColor = index === 0 ? "#FF4444" : (isLocationReport ? "#FF9500" : "#007AFF");
          const typeCount = isLocationReport ? 
            locations.filter(l => l.type === 'location').indexOf(location) + 1 :
            locations.filter(l => l.type === 'scan').indexOf(location) + 1;
          
          return (
            <View key={location.id} style={styles.locationItem}>
              <View style={styles.locationHeader}>
                <View style={styles.locationIcon}>
                  <Ionicons 
                    name={isLocationReport ? "location" : "qr-code"} 
                    size={20} 
                    color={iconColor} 
                  />
                </View>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationTitle}>
                    {isLocationReport ? `Location Report #${typeCount}` : `QR Scan #${typeCount}`}
                    {index === 0 && <Text style={styles.latestBadge}> • Latest</Text>}
                  </Text>
                  <Text style={styles.locationTime}>
                    {formatDateTime(location.timestamp)}
                  </Text>
                  <Text style={[styles.locationTypeText, { color: iconColor }]}>
                    {isLocationReport ? '📍 Reported by finder' : '📱 QR code scanned'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.mapButtonSmall}
                  onPress={() => openInMaps(
                    location.latitude,
                    location.longitude,
                    isLocationReport ? 'Pet Location Report' : 'Pet QR Scan'
                  )}
                >
                  <Ionicons name="map" size={16} color="#007AFF" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.locationDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="pin-outline" size={16} color="#666" />
                  <Text style={styles.detailText}>
                    {location.city || location.locationName || 'Unknown location'}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={16} color="#666" />
                  <Text style={styles.detailText}>
                    {new Date(location.timestamp).toLocaleString()}
                  </Text>
                </View>
                
                {location.deviceType && (
                  <View style={styles.detailRow}>
                    <Ionicons name="phone-portrait-outline" size={16} color="#666" />
                    <Text style={styles.detailText}>
                      {location.deviceType}
                    </Text>
                  </View>
                )}

                {location.accuracy && (
                  <View style={styles.detailRow}>
                    <Ionicons name="radio-outline" size={16} color="#666" />
                    <Text style={styles.detailText}>
                      ±{Math.round(location.accuracy)}m accuracy
                    </Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Ionicons name="navigate-outline" size={16} color="#666" />
                  <Text style={styles.detailText}>
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </Text>
                </View>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {showMap ? (
        <PetLocationMap petId={petId} />
      ) : (
        renderLocationsList()
      )}
      
      {locations.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{locations.length}</Text>
            <Text style={styles.statLabel}>Total Scans</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {locations.length > 0 ? formatDateTime(locations[0].timestamp) : 'Never'}
            </Text>
            <Text style={styles.statLabel}>Last Seen</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerButton: {
    marginRight: 16,
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  locationItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  latestBadge: {
    color: '#FF4444',
    fontSize: 14,
  },
  locationTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  locationDetails: {
    paddingLeft: 52,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  statsContainer: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 20,
  },
});

export default PetLocationScreen;