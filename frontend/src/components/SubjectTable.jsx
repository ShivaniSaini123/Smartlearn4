import React, { useEffect, useState, useContext } from 'react';
import { EmailContext } from '../contexts/EmailContext';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import tireImage from './Tire.png'; 
import './StudyMaterials.css';
import { API_BASE } from '../environment';

const StudyMaterials = () => {
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [completedChapters, setCompletedChapters] = useState({});
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const { email } = useContext(EmailContext);
  const navigate = useNavigate();

  const branches = ["CSE", "ECE", "EE", "MECH", "CHEM", "PIE"];
  const semesters = Array.from({ length: 8 }, (_, i) => i + 1);

  const loadSubjects = async () => {
    if (!selectedBranch || !selectedSemester) return;
    const response = await axios.get(`${API_BASE}/api/syllabus?branchName=${selectedBranch}&semesterNumber=${selectedSemester}`);
    setSubjects(response.data[0].semesters[0].subjects);
  };

  const loadChapters = async () => {
    if (!selectedBranch || !selectedSemester || !selectedSubject) return;
    const response = await axios.get(`${API_BASE}/api/syllabus?branchName=${selectedBranch}&semesterNumber=${selectedSemester}&subjectName=${selectedSubject}`);
    const subjectData = response.data[0].semesters[0].subjects.find(subject => subject.subjectName === selectedSubject);
    setChapters(subjectData ? subjectData.chapters : []);
  };

  const showAuraPointsPopup = () => {
    Swal.fire({
      title: 'Thala for a Reason!',
      text: 'Your aura points have increased by 7.',
      imageUrl: tireImage,
      imageWidth: 100,
      imageHeight: 100,
      imageAlt: 'Tire Image',
      background: '#212121',
      color: '#fff',
      confirmButtonColor: '#ff66ff',
      confirmButtonText: 'Awesome!',
      customClass: {
        popup: 'custom-swal-popup',
      },
    });
  };

  const toggleChapterCompletion = async (chapterName) => {
    if (!completedChapters[chapterName]) {
      try {
        await axios.post(`${API_BASE}/increment-aura-points`, {
          email: email,
          incrementValue: 7,
        });

        setCompletedChapters((prev) => ({
          ...prev,
          [chapterName]: true,
        }));

        showAuraPointsPopup();
      } catch (error) {
        console.error('Error updating aura points:', error);
        alert('Failed to update aura points. Please try again.');
      }
    }
  };

  useEffect(() => {
    loadSubjects();
  }, [selectedBranch, selectedSemester]);

  useEffect(() => {
    loadChapters();
  }, [selectedSubject]);

  return (
    <div className="page-container">
      <div className="viewer-box">
        <div className="title-container">
          <h1 className="text-3xl font-bold mb-6">Syllabus Viewer</h1>
        </div>

        <div className="select-container">
          <div className="select-field">
            <label htmlFor="branch">Select Branch:</label>
            <select
              id="branch"
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setSelectedSemester('');
                setSelectedSubject('');
                setSubjects([]);
                setChapters([]);
              }}
            >
              <option value="">--Select Branch--</option>
              {branches.map((branch, index) => (
                <option key={index} value={branch}>{branch}</option>
              ))}
            </select>
          </div>

          <div className="select-field">
            <label htmlFor="semester">Select Semester:</label>
            <select
              id="semester"
              onChange={(e) => {
                setSelectedSemester(e.target.value);
                setSelectedSubject('');
                setChapters([]);
              }}
              disabled={!selectedBranch}
            >
              <option value="">--Select Semester--</option>
              {semesters.map((semesterNumber) => (
                <option key={semesterNumber} value={semesterNumber}>Semester {semesterNumber}</option>
              ))}
            </select>
          </div>

          <div className="select-field">
            <label htmlFor="subject">Select Subject:</label>
            <select
              id="subject"
              onChange={(e) => setSelectedSubject(e.target.value)}
              disabled={!selectedSemester}
            >
              <option value="">--Select Subject--</option>
              {subjects.map((subject, index) => (
                <option key={index} value={subject.subjectName}>{subject.subjectName}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="chapter-resources">
          <h2 className="text-2xl font-bold mb-4">Chapters:</h2>
          <ul className="chapter-list">
            {chapters.map((chapter, index) => (
              <li key={index} className="chapter-item">
                <div className="chapter-info">
                  <strong>{chapter.chapterName}</strong>
                  <div>
                    <a href={chapter.resources.pretestLink} target="_blank" rel="noopener noreferrer">Pretest</a>
                    <a href={chapter.resources.studyMaterialLink} target="_blank" rel="noopener noreferrer">Study Material</a>
                    <a href={chapter.resources.assignmentLink} target="_blank" rel="noopener noreferrer">Assignment</a>
                  </div>
                </div>
                <button
                  className={`complete-button ${completedChapters[chapter.chapterName] ? 'completed' : ''}`}
                  onClick={() => toggleChapterCompletion(chapter.chapterName)}
                >
                  {completedChapters[chapter.chapterName] ? 'Completed' : 'Complete'}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="back-button-container">
          <button className="back-button" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudyMaterials;