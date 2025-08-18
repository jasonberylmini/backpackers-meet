# RideTribe Database Documentation

## Overview
RideTribe is a travel companion application built with MongoDB. This document provides the complete database schema documentation using JSON Schema format.

## Database Collections

### 1. Users Collection

**Purpose**: Store user profiles, authentication, and preferences

```json
{
  "_id": "ObjectId",
  "name": "String (required)",
  "email": "String (required, unique)",
  "passwordHash": "String (required)",
  "phone": "String",
  "gender": "String",
  "preferences": "String",
  "verificationStatus": "Enum: pending | verified | rejected",
  "idDocument": "String (file path)",
  "idSelfie": "String (file path)",
  "role": "Enum: traveler | admin (default: traveler)",
  "status": "Enum: active | banned | suspended (default: active)",
  "isBanned": "Boolean (default: false)",
  "averageRating": "Number (default: 0)",
  "totalReviews": "Number (default: 0)",
  "profileImage": "String (file path)",
  "coverImage": "String (default: '')",
  "bio": "String (default: '')",
  "lastLogin": "Date",
  "accountStatus": "Enum: active | suspended | deleted (default: active)",
  "deletedAt": "Date",
  "dateOfBirth": "Date",
  "username": "String (unique, sparse)",
  "country": "String (default: '')",
  "instagram": "String (default: '')",
  "languages": ["String"],
  "resetPasswordToken": "String",
  "resetPasswordExpires": "Date",
  "createdAt": "Date (default: Date.now)",
  "updatedAt": "Date (default: Date.now)",
  
  // References to other collections
  "joinedGroups": ["ObjectId -> trips"],
  "blockedUsers": ["ObjectId -> users"],
  "friends": ["ObjectId -> users"],
  
  // Embedded documents
  "moderation": {
    "notificationCount": "Number (default: 0)",
    "reported": "Boolean (default: false)",
    "reportedAt": "Date",
    "reportReason": "String",
    "bannedAt": "Date",
    "unbannedAt": "Date",
    "warnedAt": "Date",
    "warningCount": "Number (default: 0)",
    "warningReason": "String"
  },
  
  "notificationPrefs": {
    "inApp": "Boolean (default: true)",
    "email": "Boolean (default: false)",
    "sms": "Boolean (default: false)"
  }
}
```

**Indexes:**
- `email` (unique)
- `username` (unique, sparse)
- `verificationStatus`
- `status`
- `role`

### 2. Trips Collection

**Purpose**: Store trip information and member relationships

```json
{
  "_id": "ObjectId",
  "creator": "ObjectId -> users (required)",
  "destination": "String (required)",
  "startDate": "String (required)",
  "endDate": "String (required)",
  "budget": "Number (required)",
  "tripType": "String (required) - carpool | rental | public transport",
  "status": "Enum: active | completed | cancelled | suspended (default: active)",
  "description": "String (default: '')",
  "images": ["String"],
  "privacy": "Enum: public | private (default: public)",
  "deletedAt": "Date",
  "createdAt": "Date (default: Date.now)",
  "updatedAt": "Date (default: Date.now)",
  
  // References to other collections
  "members": ["ObjectId -> users"],
  
  // Embedded documents
  "location": {
    "lat": "Number",
    "lng": "Number"
  },
  
  "expenses": [{
    "description": "String",
    "amount": "Number",
    "paidBy": "ObjectId -> users"
  }],
  
  "moderation": {
    "notificationCount": "Number (default: 0)",
    "reported": "Boolean (default: false)",
    "reportedAt": "Date",
    "reportReason": "String",
    "approvedAt": "Date",
    "suspendedAt": "Date",
    "completedAt": "Date"
  }
}
```

**Indexes:**
- `creator`
- `status`
- `privacy`
- `destination`
- `startDate`

### 3. Expenses Collection

**Purpose**: Track shared expenses within trips

```json
{
  "_id": "ObjectId",
  "groupId": "ObjectId -> trips (required)",
  "contributorId": "ObjectId -> users (required)",
  "amount": "Number (required, min: 0)",
  "description": "String (required, maxlength: 200)",
  "category": "Enum: transport | accommodation | food | activities | shopping | other (default: other)",
  "currency": "String (default: 'USD', maxlength: 3)",
  "date": "Date (default: Date.now)",
  "status": "Enum: pending | settled | disputed (default: pending)",
  "receipt": "String (file path)",
  "splitType": "Enum: auto | manual (default: auto)",
  "tags": ["String"],
  "notes": "String (maxlength: 500)",
  "chatMessageId": "ObjectId -> messages",
  "createdAt": "Date (default: Date.now)",
  "updatedAt": "Date (default: Date.now)",
  
  // References to other collections
  "splitBetween": ["ObjectId -> users"],
  
  // Embedded documents
  "location": {
    "name": "String",
    "address": "String",
    "coordinates": {
      "lat": "Number",
      "lng": "Number"
    }
  },
  
  "shares": [{
    "userId": "ObjectId -> users",
    "amount": "Number",
    "status": "Enum: pending | paid (default: pending)",
    "paidAt": "Date"
  }],
  
  "settlements": [{
    "from": "ObjectId -> users",
    "to": "ObjectId -> users",
    "amount": "Number",
    "status": "Enum: pending | completed (default: pending)",
    "completedAt": "Date",
    "method": "String - cash | transfer | app"
  }]
}
```

**Indexes:**
- `groupId` + `date` (compound)
- `contributorId` + `date` (compound)
- `status` + `groupId` (compound)
- `category`

### 4. Reviews Collection

**Purpose**: Store user and trip reviews

```json
{
  "_id": "ObjectId",
  "reviewer": "ObjectId -> users (required)",
  "reviewType": "Enum: trip | user (required)",
  "tripId": "ObjectId -> trips (required)",
  "reviewedUser": "ObjectId -> users",
  "rating": "Number (required, min: 1, max: 5)",
  "feedback": "String (required)",
  "tags": ["String"],
  "flagged": "Boolean (default: false)",
  "status": "Enum: pending | approved | rejected (default: pending)",
  "adminResponse": "String (default: '')",
  "deletedAt": "Date",
  "createdAt": "Date (default: Date.now)",
  "updatedAt": "Date (default: Date.now)",
  
  // Embedded documents
  "moderation": {
    "notificationCount": "Number (default: 0)"
  },
  
  "editHistory": [{
    "feedback": "String",
    "editedAt": "Date"
  }]
}
```

**Indexes:**
- `reviewer` + `reviewType` + `tripId` + `reviewedUser` (unique compound)
- `tripId`
- `reviewedUser`
- `status`
- `rating`

### 5. Chats Collection

**Purpose**: Manage chat rooms for trips and direct messages

```json
{
  "_id": "ObjectId",
  "type": "Enum: group | personal (required)",
  "tripId": "ObjectId -> trips",
  "participants": ["ObjectId -> users"],
  "name": "String (default: function)",
  "isActive": "Boolean (default: true)",
  "permissions": "Enum: all | admin_only | verified_only (default: all)",
  "createdAt": "Date (default: Date.now)",
  "updatedAt": "Date (default: Date.now)",
  
  // References to other collections
  "mutedUsers": ["ObjectId -> users"],
  "blockedUsers": ["ObjectId -> users"],
  
  // Embedded documents
  "lastMessage": {
    "text": "String",
    "sender": "ObjectId -> users",
    "timestamp": "Date (default: Date.now)"
  }
}
```

**Indexes:**
- `type` + `tripId` (compound)
- `type` + `participants` (compound)
- `lastMessage.timestamp`

### 6. Messages Collection

**Purpose**: Store individual chat messages

```json
{
  "_id": "ObjectId",
  "chatId": "ObjectId -> chats (required)",
  "tripId": "ObjectId -> trips",
  "sender": "ObjectId -> users (required)",
  "text": "String (required, maxlength: 1000)",
  "type": "Enum: text | image | file | location | expense | system (default: text)",
  "status": "Enum: sent | delivered | read (default: sent)",
  "isEdited": "Boolean (default: false)",
  "editedAt": "Date",
  "systemAction": "Enum: user_joined | user_left | trip_updated | expense_added | expense_settled",
  "directToUser": "ObjectId -> users",
  "sentAt": "Date (default: Date.now)",
  "updatedAt": "Date (default: Date.now)",
  
  // References to other collections
  "replyTo": "ObjectId -> messages",
  
  // Embedded documents
  "attachments": [{
    "url": "String",
    "type": "String - image | file | document",
    "name": "String",
    "size": "Number"
  }],
  
  "location": {
    "lat": "Number",
    "lng": "Number",
    "address": "String"
  },
  
  "expense": {
    "expenseId": "ObjectId -> expenses",
    "amount": "Number",
    "description": "String"
  },
  
  "reactions": [{
    "user": "ObjectId -> users",
    "emoji": "String",
    "timestamp": "Date (default: Date.now)"
  }]
}
```

**Indexes:**
- `chatId` + `sentAt` (compound)
- `sender` + `sentAt` (compound)
- `tripId` + `sentAt` (compound)
- `type`

### 7. Notifications Collection

**Purpose**: Store user notifications

```json
{
  "_id": "ObjectId",
  "user": "ObjectId -> users (required)",
  "type": "Enum: trip | message | expense | kyc | system | admin-message | warning | info | invitation (required)",
  "title": "String (required)",
  "message": "String (required)",
  "read": "Boolean (default: false)",
  "deliveryMethod": "Enum: in-app | email | sms (default: in-app)",
  "expiry": "Date",
  "batchId": "String",
  "preferencesSnapshot": "Object",
  "createdAt": "Date (default: Date.now)",
  "updatedAt": "Date (default: Date.now)",
  
  // References to other collections
  "relatedFlag": "ObjectId -> flags",
  "relatedTrip": "ObjectId -> trips",
  "relatedReview": "ObjectId -> reviews",
  "sentBy": "ObjectId -> users",
  
  // Embedded documents
  "data": {
    "tripId": "ObjectId -> trips",
    "tripName": "String",
    "chatId": "String",
    "amount": "Number",
    "currency": "String (default: 'INR')",
    "actionUrl": "String",
    "imageUrl": "String"
  }
}
```

**Indexes:**
- `user` + `read` (compound)
- `user` + `createdAt` (compound)
- `type`
- `batchId`

### 8. Flags Collection

**Purpose**: Store user reports and moderation flags

```json
{
  "_id": "ObjectId",
  "flaggedBy": "ObjectId -> users (required)",
  "flagType": "Enum: user | trip | review | post (required)",
  "targetId": "ObjectId (required)",
  "reason": "String (required)",
  "details": "String (default: '')",
  "status": "Enum: open | dismissed | resolved (default: open)",
  "severity": "Enum: low | medium | high (default: low)",
  "adminNotes": "String (default: '')",
  "actionTaken": "String (default: '')",
  "resolved": "Boolean (default: false)",
  "dismissed": "Boolean (default: false)",
  "escalated": "Boolean (default: false)",
  "escalatedAt": "Date",
  "dismissedAt": "Date",
  "resolvedAt": "Date",
  "createdAt": "Date (default: Date.now)",
  "updatedAt": "Date (default: Date.now)",
  
  // References to other collections
  "resolvedBy": "ObjectId -> users",
  
  // Embedded documents
  "history": [{
    "status": "String",
    "changedAt": "Date",
    "changedBy": "ObjectId -> users"
  }]
}
```

**Indexes:**
- `flagType` + `targetId` (compound)
- `status`
- `severity`
- `flaggedBy`
- `resolvedBy`

### 9. Posts Collection

**Purpose**: Store social feed posts

```json
{
  "_id": "ObjectId",
  "author": "ObjectId -> users (required)",
  "audience": "Enum: worldwide | nearby (default: worldwide)",
  "content": "String (required, maxlength: 500)",
  "country": "String (default: '')",
  "createdAt": "Date (default: Date.now)",
  
  // References to other collections
  "likes": ["ObjectId -> users"],
  "comments": ["ObjectId -> comments"]
}
```

**Indexes:**
- `author`
- `audience`
- `country`
- `createdAt`

### 10. Comments Collection

**Purpose**: Store comments on posts

```json
{
  "_id": "ObjectId",
  "post": "ObjectId -> posts (required)",
  "author": "ObjectId -> users (required)",
  "content": "String (required)",
  "createdAt": "Date (default: Date.now)"
}
```

**Indexes:**
- `post`
- `author`
- `createdAt`

### 11. AdminLogs Collection

**Purpose**: Track administrative actions

```json
{
  "_id": "ObjectId",
  "adminId": "ObjectId -> users (required)",
  "action": "String (required)",
  "reason": "String",
  "outcome": "String (default: '')",
  "timestamp": "Date (default: Date.now)",
  "updatedAt": "Date (default: Date.now)",
  
  // References to other collections
  "targetUserId": "ObjectId -> users",
  "targetTripId": "ObjectId -> trips",
  "targetReviewId": "ObjectId -> reviews",
  "targetFlagId": "ObjectId -> flags"
}
```

**Indexes:**
- `adminId`
- `action`
- `timestamp`
- `targetUserId`
- `targetTripId`

## Key Relationships

### One-to-Many Relationships
- **User → Trips**: One user can create many trips
- **Trip → Expenses**: One trip can have many expenses
- **Trip → Reviews**: One trip can have many reviews
- **Chat → Messages**: One chat can have many messages
- **User → Notifications**: One user can have many notifications
- **Post → Comments**: One post can have many comments

### Many-to-Many Relationships
- **Users ↔ Trips**: Users can join multiple trips, trips can have multiple members
- **Users ↔ Users**: Friends and blocked users relationships
- **Users ↔ Expenses**: Users can contribute to multiple expenses, expenses can be split between multiple users

### Embedded vs Referenced Data

**Embedded Documents (Used for):**
- User moderation settings
- Trip location coordinates
- Expense shares and settlements
- Message attachments and reactions
- Notification data

**Referenced Documents (Used for):**
- User relationships (friends, blocked users)
- Trip memberships
- Expense contributors
- Chat participants
- Review relationships

## Design Patterns Used

1. **Embedded Document Pattern**: For data that's always accessed together (user preferences, trip location)
2. **Reference Pattern**: For large or shared data (user profiles, trip details)
3. **Array of References**: For one-to-many relationships (trip members, expense shares)
4. **Denormalization**: For read performance (duplicating user names in messages)

## Performance Considerations

### Indexing Strategy
- Compound indexes on frequently queried combinations
- Unique indexes on business-critical fields
- Sparse indexes for optional fields

### Sharding Strategy
- Consider sharding by `userId` for user-centric collections
- Consider sharding by `tripId` for trip-centric collections

### Data Size Management
- Monitor embedded document sizes (16MB limit)
- Consider moving large arrays to separate collections if they grow significantly

## Security Considerations

1. **Authentication**: All user data requires authentication
2. **Authorization**: Role-based access control (traveler vs admin)
3. **Data Validation**: JSON Schema validation on all collections
4. **Input Sanitization**: All user inputs are validated and sanitized
5. **Audit Trail**: AdminLogs collection tracks all administrative actions

## Backup and Recovery

1. **Regular Backups**: Daily automated backups
2. **Point-in-Time Recovery**: Maintain oplog for recovery
3. **Data Retention**: Implement data retention policies
4. **Disaster Recovery**: Multi-region backup strategy

---

*This documentation should be updated whenever the database schema changes.*
