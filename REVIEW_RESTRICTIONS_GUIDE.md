# Review System Restrictions Guide

## Overview

The review system has been enhanced with comprehensive restrictions to ensure fair and meaningful reviews. This guide documents all the implemented restrictions and how they work.

## Core Restrictions

### 1. Trip Completion Requirement
**Restriction**: Only after completing a trip can users post reviews

**Implementation**:
- Backend: Checks `trip.status === 'completed'` before allowing any review submission
- Frontend: Shows appropriate messaging when trip is not completed
- Error Message: "You can only review after the trip is completed."

**Code Location**:
- Backend: `server/controllers/reviewController.js` - `giveReview()` function
- Frontend: `client/src/components/ReviewsList.jsx` - `checkReviewPermissions()`

### 2. Trip Membership Validation
**Restriction**: Only trip members can review each other (not anyone else)

**Implementation**:
- Backend: Validates that the reviewer is either the trip creator or a member
- Frontend: Checks trip membership before showing review options
- Error Message: "You can only review trips you participated in."

**Code Location**:
- Backend: `server/controllers/reviewController.js` - `isTripParticipant()` function
- Frontend: `client/src/components/ReviewsList.jsx` - Permission checking

### 3. Self-Review Prevention
**Restriction**: Users cannot review themselves

**Implementation**:
- Backend: Compares `reviewer` and `reviewedUser` IDs
- Frontend: Prevents self-review attempts in the UI
- Error Message: "You cannot review yourself."

**Code Location**:
- Backend: `server/controllers/reviewController.js` - `giveReview()` function
- Frontend: `client/src/components/ReviewsList.jsx` - Permission validation

### 4. Trip Member Review Validation
**Restriction**: Only trip members can review the trip itself

**Implementation**:
- Backend: Ensures both reviewer and reviewed user are trip members for user reviews
- Frontend: Validates trip membership for both users
- Error Message: "You can only review other members of the same trip."

**Code Location**:
- Backend: `server/controllers/reviewController.js` - `canReviewUser()` function
- Frontend: `client/src/components/ReviewsList.jsx` - User review validation

## Additional Features

### 5. Duplicate Review Prevention
**Restriction**: Users can only submit one review per trip/user combination

**Implementation**:
- Backend: Database index prevents duplicates
- Frontend: Checks for existing reviews before allowing submission
- Error Message: "You have already submitted a review for this trip/user combination."

### 6. Review Permissions API
**Feature**: New API endpoint to check review permissions before submission

**Endpoint**: `GET /api/reviews/permissions`

**Parameters**:
- `reviewType`: 'trip' or 'user'
- `tripId`: Required trip ID
- `reviewedUser`: Required for user reviews

**Response**:
```json
{
  "canReview": boolean,
  "reason": "string",
  "tripStatus": "string",
  "isTripMember": boolean,
  "tripCompleted": boolean
}
```

### 7. Enhanced Frontend Feedback
**Feature**: Detailed feedback about why reviews are not allowed

**Implementation**:
- Shows specific error messages for each restriction
- Displays trip status information
- Provides guidance on how to become eligible for reviews

## API Endpoints

### Review Submission
```
POST /api/reviews/submit
```

**Required Fields**:
- `reviewType`: 'trip' or 'user'
- `tripId`: Trip ID (required for all reviews)
- `rating`: 1-5 rating
- `feedback`: Review text (10-1000 characters)
- `reviewedUser`: User ID (required for user reviews)

### Permission Checking
```
GET /api/reviews/permissions?reviewType=trip&tripId=123&reviewedUser=456
```

### Trip Information
```
GET /api/trips/completed-with-user/:userId
```
Returns completed trips where both current user and specified user participated.

## Frontend Components

### ReviewsList Component
**File**: `client/src/components/ReviewsList.jsx`

**Features**:
- Real-time permission checking
- Detailed restriction feedback
- Trip selection for user reviews
- Loading states and error handling

### ReviewForm Component
**File**: `client/src/components/ReviewForm.jsx`

**Features**:
- Trip selection dropdown for user reviews
- Validation before submission
- Error handling and user feedback

## Error Handling

### Backend Error Responses
All restrictions return appropriate HTTP status codes:

- `400 Bad Request`: Invalid data (self-review, missing fields)
- `403 Forbidden`: Permission denied (not trip member, trip not completed)
- `404 Not Found`: Trip or user not found
- `409 Conflict`: Duplicate review attempt

### Frontend Error Display
- Toast notifications for immediate feedback
- Detailed restriction notices with explanations
- Loading states during permission checks

## Testing

### Test Script
**File**: `server/scripts/testReviewRestrictions.js`

**Coverage**:
- Trip completion requirement
- Trip membership validation
- Self-review prevention
- Duplicate review prevention
- Permission API functionality

**Run Command**:
```bash
cd server
node scripts/testReviewRestrictions.js
```

## Database Schema

### Review Model
```javascript
{
  reviewer: ObjectId,        // User submitting review
  reviewType: String,        // 'trip' or 'user'
  tripId: ObjectId,          // Required for all reviews
  reviewedUser: ObjectId,    // Required for user reviews
  rating: Number,            // 1-5 rating
  feedback: String,          // Review text
  tags: [String],            // Optional tags
  status: String,            // 'pending', 'approved', 'rejected'
  createdAt: Date
}
```

### Trip Model
```javascript
{
  creator: ObjectId,         // Trip creator
  members: [ObjectId],       // Trip members
  status: String,            // 'active', 'completed', 'cancelled'
  destination: String,
  startDate: String,
  endDate: String,
  // ... other fields
}
```

## Security Considerations

1. **Authentication Required**: All review endpoints require valid JWT tokens
2. **Authorization Checks**: Server-side validation of all restrictions
3. **Input Validation**: Comprehensive validation of all review data
4. **Rate Limiting**: Consider implementing rate limiting for review submissions
5. **Content Moderation**: Automated checks for inappropriate content

## Future Enhancements

1. **Review Editing**: Allow users to edit their reviews within a time limit
2. **Review Responses**: Allow reviewed users to respond to reviews
3. **Review Analytics**: Track review patterns and identify potential abuse
4. **Advanced Moderation**: AI-powered content analysis
5. **Review Categories**: Different review types (safety, communication, etc.)

## Troubleshooting

### Common Issues

1. **"Trip not found"**: Ensure tripId is valid and user has access
2. **"Permission denied"**: Check trip membership and completion status
3. **"Duplicate review"**: User has already reviewed this trip/user combination
4. **"Cannot review yourself"**: User is trying to review themselves

### Debug Steps

1. Check trip status in database
2. Verify user membership in trip
3. Check for existing reviews
4. Validate all required fields are present
5. Review server logs for detailed error messages

## Conclusion

The review system now provides a robust, secure, and user-friendly experience with comprehensive restrictions that ensure fair and meaningful reviews. All restrictions are enforced both on the frontend and backend, with clear error messages and helpful user guidance.
