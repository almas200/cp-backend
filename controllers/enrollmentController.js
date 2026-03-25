const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const { logActivity } = require("../utils/activityLogger");

// ✅ ENROLL USER IN COURSE
exports.enrollCourse = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const userId = req.user._id;

    // Verify course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      userId: userId,
      courseId: courseId,
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this course',
      });
    }

    // Create new enrollment
    const enrollment = new Enrollment({
      userId: userId,
      courseId: courseId,
      status: 'active',
      overallProgress: 0,
      completedLessons: [],
      certificateIssued: false,
    });

    await enrollment.save();

    // Log the activity
    await logActivity({
      type: "COURSE_ENROLL",
      message: `User ${req.user.name} enrolled in ${course.title}.`,
      user: userId,
      metadata: { courseId: course._id, courseTitle: course.title }
    });

    res.status(201).json({
      success: true,
      message: 'Successfully enrolled in course',
      enrollment,
    });
  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enroll',
      error: error.message,
    });
  }
};

// ✅ UPDATE PROGRESS - MARK LESSON COMPLETE
exports.updateProgress = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const userId = req.user._id;
    const { lessonKey, lessonDuration } = req.body;

    if (!lessonKey) {
      return res.status(400).json({
        success: false,
        message: 'lessonKey is required',
      });
    }

    // Verify course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    const totalLessons = course.lessonsCount || 1;

    // Find enrollment
    const enrollment = await Enrollment.findOne({
      userId: userId,
      courseId: courseId,
    });

    if (!enrollment) {
      return res.status(400).json({
        success: false,
        message: 'User not enrolled in this course',
      });
    }

    // completedLessons: [String]  ← schema ko iske hisaab se rakho
    // Add lesson if not already completed
    if (!enrollment.completedLessons.includes(lessonKey)) {
      enrollment.completedLessons.push(lessonKey);

      // Add lesson duration to hours learned (converting minutes to hours)
      if (lessonDuration) {
        enrollment.hoursLearned = (enrollment.hoursLearned || 0) + (Number(lessonDuration) / 60);
      }

      const completed = enrollment.completedLessons.length;
      enrollment.overallProgress = Math.min(
        100,
        Math.round((completed / totalLessons) * 100)
      );

      if (enrollment.overallProgress >= 100) {
        enrollment.status = 'completed';
      }

      await enrollment.save();
    }


    res.status(200).json({
      success: true,
      message: 'Progress updated',
      progress: enrollment.overallProgress,
      enrollment,
    });
  } catch (error) {
    console.error('Progress update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update progress',
      error: error.message,
    });
  }
};

// ✅ GET MY COURSES
exports.getMyCourses = async (req, res) => {
  try {
    const userId = req.user._id;

    const enrollments = await Enrollment.find({ userId: userId })
      .populate(
        'courseId',
        'title slug description price thumbnail level lessonsCount'
      )
      .sort('-updatedAt');

    const validEnrollments = enrollments.filter(en => en.courseId != null);

    const courses = validEnrollments.map((en) => ({
      _id: en.courseId._id,
      enrollmentId: en._id,
      title: en.courseId.title,
      slug: en.courseId.slug,
      description: en.courseId.description,
      price: en.courseId.price,
      thumbnail: en.courseId.thumbnail,
      level: en.courseId.level,
      lessonsCount: en.courseId.lessonsCount,
      progressPercent: en.overallProgress,
      completedLessons: en.completedLessons.length,
      hoursLearned: en.hoursLearned || 0,
      status: en.status,
    }));

    res.status(200).json({
      success: true,
      message: 'My courses fetched',
      courses,
      totalCourses: courses.length,
    });
  } catch (error) {
    console.error('MY-COURSES error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load courses',
      error: error.message,
    });
  }
};

// ✅ GENERATE PDF CERTIFICATE
exports.getCertificate = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const userId = req.user._id;

    // Fetch enrollment and populate course details
    const enrollment = await Enrollment.findOne({ userId, courseId }).populate('courseId');

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    if (enrollment.overallProgress < 100) {
      return res.status(400).json({ success: false, message: 'Course not fully completed yet' });
    }

    // Import PDFKit
    const PDFDocument = require('pdfkit');

    // Create a document
    // Standard A4 landscape size 
    const doc = new PDFDocument({
      layout: 'landscape',
      size: 'A4',
    });

    // Set headers so browser downloads it as a PDF
    const filename = `Certificate_${enrollment.courseId.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe PDF to the response
    doc.pipe(res);

    const width = doc.page.width;
    const height = doc.page.height;

    // Background
    doc.rect(0, 0, width, height).fill('#ffffff');

    // Outer border (Dark Blue)
    doc.lineWidth(10).strokeColor('#1e40af').rect(20, 20, width - 40, height - 40).stroke();
    // Inner border (Gold/Yellow)
    doc.lineWidth(4).strokeColor('#fbbf24').rect(35, 35, width - 70, height - 70).stroke();

    // Corner Accents (Gold)
    const drawCorner = (x, y, isLeft, isTop) => {
      doc.lineWidth(8).strokeColor('#fbbf24');
      const xLen = isLeft ? 50 : -50;
      const yLen = isTop ? 50 : -50;
      doc.moveTo(x + xLen, y).lineTo(x, y).lineTo(x, y + yLen).stroke();
    };
    drawCorner(35, 35, true, true);
    drawCorner(width - 35, 35, false, true);
    drawCorner(35, height - 35, true, false);
    drawCorner(width - 35, height - 35, false, false);

    // Decorative Graphic (Top Center)
    doc.fillColor('#1e40af')
      .polygon([width / 2, 50], [width / 2 + 30, 90], [width / 2, 110], [width / 2 - 30, 90])
      .fill();

    doc.moveDown(4);

    // Title
    doc.font('Times-BoldItalic')
      .fillColor('#1e40af')
      .fontSize(55)
      .text('CERTIFICATE', 0, 130, { align: 'center' });

    doc.font('Times-Roman')
      .fontSize(25)
      .fillColor('#b45309')
      .text('OF COMPLETION', 0, 190, { align: 'center', characterSpacing: 5 });

    doc.moveDown(2);

    doc.font('Helvetica')
      .fillColor('#475569')
      .fontSize(16)
      .text('THIS IS PROUDLY PRESENTED TO', 0, 250, { align: 'center' });

    doc.font('Courier-Bold')
      .fillColor('#1e40af')
      .fontSize(45)
      .text(req.user.name.toUpperCase(), 0, 290, { align: 'center' });

    // Underline name
    const namewidth = doc.widthOfString(req.user.name.toUpperCase());
    doc.lineWidth(2).strokeColor('#cbd5e1').moveTo((width - namewidth) / 2, 345).lineTo((width + namewidth) / 2, 345).stroke();

    doc.font('Helvetica-Oblique')
      .fillColor('#475569')
      .fontSize(16)
      .text('for successfully completing the online course:', 0, 370, { align: 'center' });

    doc.font('Helvetica-Bold')
      .fillColor('#0f172a')
      .fontSize(28)
      .text(enrollment.courseId.title, 50, 410, { align: 'center', width: width - 100 });

    // Signatures and Dates
    const completionDate = enrollment.updatedAt ? enrollment.updatedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    doc.lineWidth(1).strokeColor('#1e40af');

    // Date block
    doc.moveTo(120, 500).lineTo(280, 500).stroke();
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#1e293b').text(completionDate, 120, 480, { width: 160, align: 'center' });
    doc.font('Helvetica').fontSize(12).fillColor('#64748b').text('DATE', 120, 510, { width: 160, align: 'center' });

    // Signature block
    doc.moveTo(width - 280, 500).lineTo(width - 120, 500).stroke();
    doc.font('Courier-Oblique').fontSize(22).fillColor('#1e40af').text('CourseHub', width - 280, 470, { width: 160, align: 'center' });
    doc.font('Helvetica').fontSize(12).fillColor('#64748b').text('AUTHORIZED SIGNATURE', width - 280, 510, { width: 160, align: 'center' });

    // Seal
    doc.circle(width / 2, 500, 35).lineWidth(2).strokeColor('#fbbf24').stroke();
    doc.circle(width / 2, 500, 30).lineWidth(1).strokeColor('#fbbf24').stroke();
    doc.font('Times-Bold').fontSize(14).fillColor('#b45309').text('VERIFIED', width / 2 - 35, 492, { width: 70, align: 'center' });

    // Mark as issued in DB
    if (!enrollment.certificateIssued) {
      enrollment.certificateIssued = true;
      await enrollment.save();
    }

    // Finalize PDF file
    doc.end();

  } catch (error) {
    console.error('Certificate generation error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to generate certificate' });
    }
  }
};
